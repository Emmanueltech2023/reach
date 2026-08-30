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
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // 1. Get all conversations where the user is a participant
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (partError) throw partError;
    if (!participations || participations.length === 0) {
      return NextResponse.json({ count: 0, byConversation: {} });
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // 2. Fetch unread messages in these conversations where the user is not the sender
    const { data: unreadMessages, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, delivery_status, is_read")
      .in("conversation_id", conversationIds)
      .neq("sender_id", userId);

    if (msgError) throw msgError;

    // Filter messages that have not been read yet
    const unread = (unreadMessages || []).filter(
      (m: any) => m.delivery_status !== "read" && m.is_read !== true
    );

    const byConversation: Record<string, number> = {};
    for (const msg of unread) {
      byConversation[msg.conversation_id] = (byConversation[msg.conversation_id] || 0) + 1;
    }

    return NextResponse.json({
      count: unread.length,
      byConversation,
    });
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: safeError.message, count: 0 }, { status: 500 });
  }
}
