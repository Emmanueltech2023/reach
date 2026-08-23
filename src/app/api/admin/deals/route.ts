import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    // 1. Bulletproof direct query without fragile PostgREST join aliases
    const { data: rawDeals, error: dealsErr } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });

    if (dealsErr) {
      console.error("Deals GET query error:", dealsErr);
      return NextResponse.json({ deals: [], error: dealsErr.message });
    }

    if (!rawDeals || rawDeals.length === 0) {
      return NextResponse.json({ deals: [] });
    }

    // 2. Enrich deals with investor profiles and project details
    const dealsWithDetails = await Promise.all(
      rawDeals.map(async (d: any) => {
        let investor = null;
        let project = null;

        if (d.investor_id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", d.investor_id)
            .maybeSingle();
          investor = p;
        }

        if (d.project_id) {
          const { data: proj } = await supabase
            .from("projects")
            .select("*")
            .eq("id", d.project_id)
            .maybeSingle();
          project = proj;
        }

        const commRate = Number(d.commission_rate ?? 3);
        const commAmount = (Number(d.amount || 0) * commRate) / 100;

        return {
          ...d,
          commission_amount: commAmount,
          commission_status: d.commission_paid ? "paid" : "pending",
          project: {
            title: d.title || project?.title || project?.name || "Investment Deal",
            sector: project?.sector || "General",
            funding_goal: project?.funding_goal || project?.target_amount || 0,
          },
          investor,
        };
      })
    );

    return NextResponse.json({ deals: dealsWithDetails });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Deals fetch error";
    console.error("Deals GET catch:", msg);
    return NextResponse.json({ deals: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { dealId, action, stage, commissionStatus, notes } = await req.json();

    if (!dealId) {
      return NextResponse.json({ error: "Missing dealId" }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (action === "update_stage" && stage) {
      updates.stage = stage;
      if (stage === "closed") {
        updates.closed_at = new Date().toISOString();
      }
    }

    if (action === "update_commission") {
      updates.commission_paid = commissionStatus === "paid" ? true : false;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data: updatedDeal, error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", dealId)
      .select("*")
      .single();

    if (error) throw error;

    // Log activity
    void logActivity({
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username || "Admin",
      actorEmail: auth.user.email,
      actorRole: "admin",
      actionType: "UPDATE_DEAL",
      targetId: dealId,
      description: `Updated deal ${dealId} (Action: ${action}, Stage: ${stage || 'N/A'})`,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update deal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
