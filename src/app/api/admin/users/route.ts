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

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    // Record Audit Log
    let actionType = "UPDATE_USER_PROFILE";
    if (updates.is_banned !== undefined) actionType = updates.is_banned ? "SUSPEND_USER" : "UNSUSPEND_USER";
    if (updates.is_scam !== undefined) actionType = updates.is_scam ? "FLAG_SCAM_USER" : "UNFLAG_SCAM_USER";

    await logActivity({
      req,
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username,
      actorRole: auth.profile.role,
      actionType,
      targetId: userId,
      targetType: "user",
      description: `Admin ${auth.profile.full_name || auth.profile.username} updated profile for user ${data?.full_name || userId} (${actionType})`,
      details: updates,
    });

    return NextResponse.json({ user: data });
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
