import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, action, rejectionReason } = await req.json();
    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const [profileRes, authRes] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", userId).single(),
      supabase.auth.admin.getUserById(userId)
    ]);

    const { full_name, role } = profileRes.data || {};
    const email = authRes.data.user?.email;

    // Database Update
    const updatePayload: Record<string, any> = {
      kyc_status: action === "approve" ? "approved" : "rejected",
      is_verified: action === "approve",
    };

    if (action === "reject" && rejectionReason) {
      updatePayload.kyc_rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) throw updateError;

    await logActivity({
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username,
      actorRole: auth.profile.role,
      actionType: action === "approve" ? "APPROVE_KYC" : "REJECT_KYC",
      targetId: userId,
      targetType: "user",
      description: `Admin ${auth.profile.full_name || auth.profile.username} ${action}d KYC for user ${full_name || userId}`,
    }).catch(() => {});

    // Notification
    const dashUrl = role === "builder" ? "/dashboard/builder" : role === "talent" ? "/dashboard/talent" : "/dashboard/investor";

    await supabase.from("notifications").insert({
      user_id: userId,
      title: action === "approve" ? "KYC Identity Verified" : "KYC Verification Declined",
      body: action === "approve"
        ? "Your identity verification documents have been approved. You now have full verified status on REACH."
        : `Your identity verification could not be approved. Reason: ${rejectionReason || "Please upload clearer, valid documents and resubmit."} You can resubmit your verification on your profile.`,
      type: "general",
      action_url: action === "approve" ? dashUrl : "/dashboard/profile",
      is_read: false,
    });

    if (action === "approve") {
      try {
        await supabase.from("trust_events").insert({ user_id: userId, event_type: "kyc_verified", points: 20 });
      } catch {}
    }

    // Email
    if (email) {
      const userName = full_name || "User";
      const emailSubject = action === "approve" ? "✓ Your REACH identity is verified" : "REACH — KYC Document Update";
      const emailHtml = action === "approve"
        ? `<div style="font-family: Arial; padding: 20px; background: #0A0A0F; color: #F5F3ED;"><h2>Congratulations ${userName}!</h2><p>Your identity documents have been approved. You now display an official Verified checkmark badge on REACH.</p></div>`
        : `<div style="font-family: Arial; padding: 20px; background: #0A0A0F; color: #F5F3ED;"><h2>Hello ${userName},</h2><p>Your KYC application could not be verified.</p><p><strong>Reason:</strong> ${rejectionReason || 'Documents were unclear or incomplete.'}</p><p>Please log in to your profile to resubmit your documents.</p></div>`;

      await sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(() => {});
    }

    return NextResponse.json({ success: true, status: action === "approve" ? "approved" : "rejected" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "KYC action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}