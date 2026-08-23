import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { target, userId, title, body, actionUrl } = await req.json();

    if (!target || !title || !body) {
      return NextResponse.json({ error: "Missing target, title, or body" }, { status: 400 });
    }

    let targetProfiles: { id: string }[] = [];

    if (target === "all") {
      const { data } = await supabase.from("profiles").select("id");
      targetProfiles = data || [];
    } else if (target === "investors") {
      const { data } = await supabase.from("profiles").select("id").eq("role", "investor");
      targetProfiles = data || [];
    } else if (target === "builders") {
      const { data } = await supabase.from("profiles").select("id").eq("role", "builder");
      targetProfiles = data || [];
    } else if (target === "user" && userId) {
      targetProfiles = [{ id: userId }];
    } else {
      return NextResponse.json({ error: "Invalid broadcast target" }, { status: 400 });
    }

    if (targetProfiles.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No matching target users found" });
    }

    const notificationsToInsert = targetProfiles.map((p) => ({
      user_id: p.id,
      title: `📢 ${title}`,
      body,
      action_url: actionUrl || null,
      type: "general",
      is_read: false,
    }));

    // Batch insert notifications (chunks of 500)
    const chunkSize = 500;
    for (let i = 0; i < notificationsToInsert.length; i += chunkSize) {
      const chunk = notificationsToInsert.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase.from("notifications").insert(chunk);
      if (insertErr) console.error("Broadcast batch insert error:", insertErr);
    }

    // Log admin broadcast activity
    void logActivity({
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username || "Admin",
      actorEmail: auth.user.email,
      actorRole: "admin",
      actionType: "BROADCAST_NOTIFICATION",
      description: `Dispatched system broadcast "${title}" to ${targetProfiles.length} users (Target: ${target})`,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, count: targetProfiles.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Broadcast failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
