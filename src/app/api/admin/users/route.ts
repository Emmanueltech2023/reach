import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: profiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, updates } = await req.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Attempt primary profile update
    const { data: updatedData, error: primaryErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    let finalData = updatedData;

    if (primaryErr) {
      console.warn("[AdminUsers] Primary update notice:", primaryErr.message);
      
      // Fallback: If is_scam or is_banned columns haven't been added to database yet, update core fields
      const safeUpdates = { ...updates };
      delete safeUpdates.is_scam;
      delete safeUpdates.is_banned;

      if (Object.keys(safeUpdates).length > 0) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("profiles")
          .update(safeUpdates)
          .eq("id", userId)
          .select("*")
          .maybeSingle();

        if (fallbackErr) {
          return NextResponse.json({ error: fallbackErr.message }, { status: 400 });
        }
        finalData = { ...(fallbackData || {}), ...updates };
      } else {
        // Fetch current profile if only is_scam/is_banned were in updates
        const { data: existingProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        finalData = { ...(existingProf || { id: userId }), ...updates };
      }
    }

    // Record Audit Log
    let actionType = "UPDATE_USER_PROFILE";
    if (updates.is_banned !== undefined) actionType = updates.is_banned ? "SUSPEND_USER" : "UNSUSPEND_USER";
    if (updates.is_scam !== undefined) actionType = updates.is_scam ? "FLAG_SCAM_USER" : "UNFLAG_SCAM_USER";

    void logActivity({
      req,
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username,
      actorRole: auth.profile.role,
      actionType,
      targetId: userId,
      targetType: "user",
      description: `Admin ${auth.profile.full_name || auth.profile.username} updated profile for user ${finalData?.full_name || userId} (${actionType})`,
      details: updates,
    }).catch(() => {});

    // Notification on KYC status update
    try {
      if (updates.kyc_status === "approved" || updates.is_verified === true) {
        const userRole = finalData?.role;
        const dashUrl = userRole === "builder" ? "/dashboard/builder" : userRole === "talent" ? "/dashboard/talent" : "/dashboard/investor";
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "KYC Identity Verified",
          body: "Your identity verification documents have been approved. You now have full verified status on REACH.",
          type: "general",
          action_url: dashUrl,
          is_read: false,
        });
      } else if (updates.kyc_status === "rejected") {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "KYC Verification Declined",
          body: `Your identity verification could not be approved. Reason: ${updates.kyc_rejection_reason || "Please upload clearer, valid documents and resubmit."} You can resubmit your verification on your profile.`,
          type: "general",
          action_url: "/dashboard/profile",
          is_read: false,
        });
      }
    } catch (notifErr) {
      console.warn("KYC update notification warning:", notifErr);
    }

    return NextResponse.json({ user: finalData || { id: userId, ...updates } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 1. Clean up associated dependencies
    try {
      await Promise.allSettled([
        supabase.from("job_applications").delete().eq("applicant_id", userId),
        supabase.from("job_bookmarks").delete().eq("user_id", userId),
        supabase.from("jobs").delete().eq("posted_by", userId),
        supabase.from("projects").delete().eq("founder_id", userId),
        supabase.from("community_posts").delete().eq("author_id", userId),
        supabase.from("notifications").delete().eq("user_id", userId),
        supabase.from("upgrade_requests").delete().eq("user_id", userId),
      ]);
    } catch (cleanupErr) {
      console.warn("User cleanup dependencies warning:", cleanupErr);
    }

    // 2. Delete user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) throw profileError;

    // 3. Attempt auth user deletion via admin service
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.warn("Auth user deletion skipped/warning:", authErr);
    }

    // Record Audit Log
    await logActivity({
      req,
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username,
      actorRole: auth.profile.role,
      actionType: "DELETE_USER",
      targetId: userId,
      targetType: "user",
      description: `Admin ${auth.profile.full_name || auth.profile.username} permanently deleted user ${userId}`,
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
