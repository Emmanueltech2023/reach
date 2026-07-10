import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, senderId, senderName } = await req.json();

    if (!conversationId || !senderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ndaContent = `📋 NDA REQUEST\n\n${senderName} has requested you sign a Non-Disclosure Agreement before proceeding with deal discussions.\n\nClick "Sign NDA" to review and sign the agreement. Your identity will be revealed upon signing.`;

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: ndaContent,
        message_type: "system",
        delivery_status: "sent", // Modified: Replaced dropped `is_read: false` column
      })
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified)`)
      .single();

    if (error) throw error;

    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}