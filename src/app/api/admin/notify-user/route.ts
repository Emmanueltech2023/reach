import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { userId, title, body, actionUrl } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Missing userId, title, or body" }, { status: 400 });
    }

    // Insert direct notification into notifications table
    const { data: notif, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        body,
        action_url: actionUrl || null,
        type: "general",
        is_read: false,
      })
      .select("*")
      .single();

    if (error) throw error;

    // Log admin activity
    void logActivity({
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username || "Admin",
      actorEmail: auth.user.email,
      actorRole: "admin",
      actionType: "NOTIFY_USER",
      targetId: userId,
      description: `Sent direct admin notification to user: "${title}"`,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, notification: notif });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to notify user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
