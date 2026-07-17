import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Re-add Admin Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { data: { user: admin } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", admin?.id).single();
    if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Validate parameters
    const { requestId, userId, plan, action } = await req.json();
    if (!requestId || !userId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 3. Handle Rejection (Immediate & Atomic)
    if (action === "reject") {
      const { error } = await supabase
        .from("upgrade_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId);
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 4. Handle Approval (Using RPC for Atomic Transaction)
    // This is safer than doing three separate await calls
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    
    const { error: rpcError } = await supabase.rpc("handle_subscription_approval", {
      target_request_id: requestId,
      target_user_id: userId,
      target_plan: plan,
      notification_title: `${planLabel} plan activated 🎉`,
      notification_body: `Your payment has been verified. Your ${plan} subscription is now active.`
    });

    if (rpcError) throw rpcError;

    // 5. Fire-and-forget Secondary Tasks
    // Fetch info in background
    const [profileRes, authRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).single(),
      supabase.auth.admin.getUserById(userId)
    ]);

    const { full_name } = profileRes.data || {};
    const email = authRes.data.user?.email;

    // Async tasks
    const trustTask = supabase.from("trust_events").insert({
      user_id: userId,
      event_type: "subscription_upgrade",
      points: plan === "premium" ? 15 : 10,
      description: `Upgraded to ${plan} subscription`,
    });

    const emailTask = (email && full_name) 
      ? sendEmail({
          to: email,
          subject: `⭐ Your iVest ${planLabel} plan is now active`,
          html: emailTemplates.upgradeApproved(full_name, planLabel),
        }).catch(err => console.error("Email failed:", err))
      : Promise.resolve();

    await Promise.all([trustTask, emailTask]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Upgrade Approval Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}