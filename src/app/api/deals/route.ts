import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getUserTier, tierCanDo } from "@/lib/tierCheck";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Get projects the user founded
    const { data: foundedProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("founder_id", userId);

    const foundedIds = foundedProjects?.map((p) => p.id) || [];

    // Build OR condition
    let query = supabase
      .from("deals")
      .select(`
        *,
        projects(id, name, short_description, logo_url, banner_url, category, sector, founder_id),
        profiles!deals_investor_id_fkey(id, full_name, username, avatar_url, is_verified, country)
      `)
      .order("created_at", { ascending: false });

    if (foundedIds.length > 0) {
      query = query.or(
        `investor_id.eq.${userId},project_id.in.(${foundedIds.join(",")})`
      );
    } else {
      query = query.eq("investor_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ deals: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      investorId, projectId, amount, title,
      commissionRate, notes,
    } = await req.json();

    if (!investorId || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Add Tier Enforcement Check
    const tier = await getUserTier(investorId);
    if (!tierCanDo(tier, "canAccessDeals")) {
      return NextResponse.json(
        {
          error: "Deal pipeline access requires a Pro or Premium plan.",
          upgradeRequired: true,
          requiredTier: "pro",
        },
        { status: 403 }
      );
    }

    // Check no existing active deal between same investor + project
    const { data: existing } = await supabase
      .from("deals")
      .select("id, stage")
      .eq("investor_id", investorId)
      .eq("project_id", projectId)
      .neq("stage", "closed")
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An active deal already exists for this project.", existingDealId: existing.id },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("deals")
      .insert({
        investor_id: investorId,
        project_id: projectId,
        amount: amount || 0,
        title: title || "Investment deal",
        stage: "nda",
        commission_rate: commissionRate || 3,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify both parties
    const { data: project } = await supabase
      .from("projects")
      .select("name, founder_id")
      .eq("id", projectId)
      .single();

    const { data: investor } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", investorId)
      .single();

    if (project?.founder_id) {
      await supabase.from("notifications").insert({
        user_id: project.founder_id,
        title: "New deal initiated",
        body: `${investor?.full_name || "An investor"} has initiated a deal for ${project.name}. Check your deal pipeline.`,
        type: "deal",
        action_url: "/dashboard/deals",
      });
    }

    return NextResponse.json({ deal: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { dealId, stage, amount, notes, commissionRate } = await req.json();

    const updates: Record<string, unknown> = {};
    if (stage) updates.stage = stage;
    if (amount !== undefined) updates.amount = amount;
    if (notes !== undefined) updates.notes = notes;
    if (commissionRate !== undefined) updates.commission_rate = commissionRate;
    if (stage === "closed") updates.closed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", dealId)
      .select(`
        *,
        projects(id, name, founder_id)
      `)
      .single();

    if (error) throw error;

    // Logic for closed deal
    if (stage === "closed" && data.amount && data.commission_rate) {
      const commission = (data.amount * data.commission_rate) / 100;
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      // Perform background tasks in parallel (non-blocking)
      await Promise.all([
        // 1. Create Invoice
        supabase.from("commission_invoices").insert({
          deal_id: dealId,
          investor_id: data.investor_id,
          project_id: data.project_id,
          deal_amount: data.amount,
          commission_rate: data.commission_rate,
          commission_amount: commission,
          status: "pending",
          due_date: dueDate.toISOString(),
        }),

        // 2. Insert Notifications
        supabase.from("notifications").insert([
          {
            user_id: data.investor_id,
            title: "🎉 Deal closed — Commission invoice generated",
            body: `Deal closed for $${data.amount.toLocaleString()}. Platform commission of $${commission.toFixed(2)} is due by ${dueDate.toLocaleDateString()}.`,
            type: "deal",
            action_url: "/dashboard/deals",
          },
          ...(data.projects?.founder_id ? [{
            user_id: data.projects.founder_id,
            title: "🎉 Deal closed",
            body: `Your deal has been marked as closed for $${data.amount.toLocaleString()}. Congratulations!`,
            type: "deal",
            action_url: "/dashboard/deals",
          }] : []),
        ]),

        // 3. Award Trust Points
        supabase.from("trust_events").insert([
          {
            user_id: data.investor_id,
            event_type: "deal_closed",
            points: 25,
            description: `Closed deal for $${data.amount.toLocaleString()}`,
          },
          ...(data.projects?.founder_id ? [{
            user_id: data.projects.founder_id,
            event_type: "deal_closed",
            points: 25,
            description: `Deal closed for ${data.projects.name}`,
          }] : []),
        ]),

        // 4. Send Email (Wrapped in async IIFE to prevent blocking)
        (async () => {
          const [{ data: authUser }, { data: invProfile }] = await Promise.all([
            supabase.auth.admin.getUserById(data.investor_id),
            supabase.from("profiles").select("full_name").eq("id", data.investor_id).single()
          ]);

          if (authUser?.user?.email && invProfile?.full_name) {
            await sendEmail({
              to: authUser.user.email,
              subject: `🎉 Deal closed — Commission invoice for ${data.projects?.name}`,
              html: emailTemplates.commissionInvoice(
                invProfile.full_name,
                data.projects?.name || "your deal",
                data.amount,
                commission,
                dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              ),
            }).catch(console.error);
          }
        })()
      ]);
    }

    return NextResponse.json({ deal: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}