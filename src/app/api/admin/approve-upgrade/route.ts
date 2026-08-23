import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json();
    const { requestId, userId: bodyUserId, plan: bodyPlan, action = "approve" } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId parameter" }, { status: 400 });
    }

    // Always fetch the upgrade request from DB to guarantee correct user_id and plan
    const { data: upgradeReq, error: fetchReqError } = await supabase
      .from("upgrade_requests")
      .select("id, user_id, plan, amount, currency")
      .eq("id", requestId)
      .single();

    if (fetchReqError || !upgradeReq) {
      console.error("Could not find upgrade request:", requestId, fetchReqError);
    }

    const userId = bodyUserId || upgradeReq?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "Target userId not found" }, { status: 400 });
    }

    // 1. Handle Rejection
    if (action === "reject") {
      const { error: reqError } = await supabase
        .from("upgrade_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (reqError) throw reqError;

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Subscription upgrade declined",
        body: "Your subscription upgrade request could not be verified. Please contact support or try again.",
        type: "general",
        action_url: "/dashboard/upgrade",
      });

      return NextResponse.json({ success: true, status: "rejected" });
    }

    // 2. Handle Approval
    // IMPORTANT: Normalize to strict lowercase "pro" or "premium"
    const rawPlan = bodyPlan || upgradeReq?.plan || "pro";
    const targetPlan = rawPlan.toLowerCase().trim() === "premium" ? "premium" : "pro";
    const planLabel = targetPlan === "premium" ? "Premium" : "Pro";

    // Update upgrade request status
    const { error: reqError } = await supabase
      .from("upgrade_requests")
      .update({
        status: "approved",
      })
      .eq("id", requestId);

    if (reqError) {
      console.error("Failed to update upgrade_request status:", reqError);
      throw reqError;
    }

    // Update user profile subscription tier directly (with strict lowercase)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: targetPlan,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile subscription_tier:", profileError);
      throw profileError;
    }

    // Optional expiration update if column is present in DB
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await supabase
        .from("profiles")
        .update({ subscription_expires_at: expiresAt.toISOString() })
        .eq("id", userId);
    } catch (e) {
      console.warn("Optional subscription_expires_at update skipped:", e);
    }

    // Send in-app notification
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: userId,
      title: `${planLabel} plan activated 🎉`,
      body: `Your payment has been verified. Your ${planLabel} subscription is now active!`,
      type: "general",
      action_url: "/dashboard/upgrade",
    });

    if (notifError) {
      console.warn("Could not insert notification:", notifError);
    }

    // Award trust points
    try {
      await supabase.from("trust_events").insert({
        user_id: userId,
        event_type: "subscription_upgrade",
        points: targetPlan === "premium" ? 15 : 10,
        description: `Upgraded to ${targetPlan} subscription`,
      });
    } catch {}

    // Send email notification non-blockingly
    try {
      const [profileRes, authRes] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", userId).single(),
        supabase.auth.admin.getUserById(userId),
      ]);

      const fullName = profileRes.data?.full_name || "Member";
      const userRole = profileRes.data?.role || "investor";
      const email = authRes.data?.user?.email;

      if (email) {
        sendEmail({
          to: email,
          subject: `⭐ Your REACH ${planLabel} plan is now active`,
          html: emailTemplates.upgradeApproved(fullName, planLabel, userRole),
        }).catch((e) => console.error("Upgrade email failed:", e));
      }
    } catch (emailErr) {
      console.warn("Could not send upgrade email:", emailErr);
    }

    return NextResponse.json({ success: true, plan: targetPlan, status: "approved" });
  } catch (err: unknown) {
    console.error("Upgrade approval endpoint error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}