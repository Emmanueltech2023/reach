import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // 1. Get all conversations this user participates in
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (partError) throw partError;
    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // 2. Fetch conversations metadata
    const { data: convos, error: convosError } = await supabase
      .from("conversations")
      .select("id, last_message_content, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (convosError) throw convosError;

    // 3. Fetch other participants profiles for these conversations
    const { data: otherParticipants, error: otherPartsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(id, full_name, username, avatar_url, is_verified, is_scam, is_banned, subscription_tier, trust_score, role)")
      .in("conversation_id", conversationIds)
      .neq("user_id", userId);

    if (otherPartsError) throw otherPartsError;

    // Map other participant profiles to conversations
    const otherPartMap = new Map();
    (otherParticipants || []).forEach((p: any) => {
      if (p.conversation_id && p.profiles) {
        otherPartMap.set(p.conversation_id, p);
      }
    });

    // 3. Simultaneously count unread counts across all matching spaces with a cleaner, single query lookup
    const { data: unreadCounts, error: unreadError } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .neq("sender_id", userId)
      .neq("delivery_status", "read"); // Replaced `is_read = false` with our tracking status

    if (unreadError) throw unreadError;

    // Map unread counts into a fast-lookup dictionary map object
    const unreadMap: Record<string, number> = {};
    unreadCounts?.forEach((msg) => {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
    });

    // 4. Assemble the exact data contract expected by your UI template
    const formattedConversations = (convos || []).map((c) => {
      const otherPart = otherPartMap.get(c.id);

      return {
        id: c.id,
        otherUser: otherPart?.profiles || null,
        lastMessage: c.last_message_content || "No messages yet",
        lastMessageTime: c.last_message_at || null,
        unreadCount: unreadMap[c.id] || 0,
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}