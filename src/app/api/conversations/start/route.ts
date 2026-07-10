import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, otherUserId, projectId } = await req.json();

    if (!userId || !otherUserId) {
      return NextResponse.json(
        { error: "Missing user IDs" },
        { status: 400 }
      );
    }

    // Check if conversation already exists between these two users
    const { data: existing } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (existing && existing.length > 0) {
      const conversationIds = existing.map((e) => e.conversation_id);

      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", conversationIds);

      if (shared && shared.length > 0) {
        return NextResponse.json({
          conversationId: shared[0].conversation_id,
          isNew: false,
        });
      }
    }

    // Create new conversation with our optimized cache strings set to null defaults
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({ 
        project_id: projectId || null,
        last_message_content: null, // Ensured fields conform cleanly during initialization
        last_message_at: null
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add both participants
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, user_id: userId },
        { conversation_id: conversation.id, user_id: otherUserId },
      ]);

    if (partError) throw partError;

    return NextResponse.json({
      conversationId: conversation.id,
      isNew: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}