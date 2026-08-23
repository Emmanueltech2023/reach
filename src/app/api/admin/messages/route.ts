import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const [{ data: flags, error: flagsErr }, { data: rawConvos, error: convosErr }] = await Promise.all([
      supabase
        .from("moderation_flags")
        .select(`
          *,
          reporter:reporter_id(id, full_name, username, avatar_url),
          message:message_id(*, sender:sender_id(id, full_name, username, avatar_url))
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select(`
          id,
          last_message_content,
          last_message_at,
          created_at,
          conversation_participants(
            user_id,
            profiles(id, full_name, username, avatar_url)
          ),
          messages(id, content, sender_id, created_at, sender:sender_id(id, full_name, username))
        `)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (flagsErr) console.warn("Flags fetch warning:", flagsErr.message);
    if (convosErr) console.warn("Convos fetch warning:", convosErr.message);

    const formattedConversations = (rawConvos || []).map((c: any) => {
      const parts = c.conversation_participants || [];
      const p1 = parts[0]?.profiles || { full_name: "Participant 1" };
      const p2 = parts[1]?.profiles || { full_name: "Participant 2" };
      return {
        ...c,
        participant1: p1,
        participant2: p2,
      };
    });

    return NextResponse.json({
      flags: flags || [],
      conversations: formattedConversations,
    });
  } catch (err: unknown) {
    return NextResponse.json({ flags: [], conversations: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { flagId, messageId, targetUserId, action, warningReason } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "delete_message" && messageId) {
      await supabase.from("messages").delete().eq("id", messageId);

      if (flagId) {
        await supabase
          .from("moderation_flags")
          .update({ status: "actioned", action_taken: "deleted_message" })
          .eq("id", flagId);
      }

      // Log activity
      void logActivity({
        req,
        actorId: auth.user.id,
        actorName: auth.profile.full_name || auth.profile.username || "Admin",
        actorEmail: auth.user.email,
        actorRole: "admin",
        actionType: "DELETE_FLAGGED_MESSAGE",
        targetId: messageId,
        description: `Deleted flagged message ${messageId}`,
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    if (action === "warn_user" && targetUserId) {
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        title: "⚠️ Official Moderation Warning",
        body: warningReason || "Your messaging activity violated REACH community safety guidelines. Repeated violations will result in account suspension.",
        type: "general",
        is_read: false,
      });

      if (flagId) {
        await supabase
          .from("moderation_flags")
          .update({ status: "actioned", action_taken: "warned_user" })
          .eq("id", flagId);
      }

      // Log activity
      void logActivity({
        req,
        actorId: auth.user.id,
        actorName: auth.profile.full_name || auth.profile.username || "Admin",
        actorEmail: auth.user.email,
        actorRole: "admin",
        actionType: "WARN_USER",
        targetId: targetUserId,
        description: `Issued official messaging moderation warning to user ${targetUserId}`,
      }).catch(() => {});

      return NextResponse.json({ success: true });
    }

    if (action === "dismiss_flag" && flagId) {
      await supabase
        .from("moderation_flags")
        .update({ status: "dismissed", action_taken: "dismissed" })
        .eq("id", flagId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Moderation action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
