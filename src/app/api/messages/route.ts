import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        profiles (
          id,
          full_name,
          username,
          avatar_url,
          is_verified
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      conversationId,
      senderId,
      content,
      messageType = "text",
      dealId = null,
    } = await req.json();

    if (!conversationId || !senderId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        delivery_status: "sent", // Modified: Matches our new WhatsApp tracking schema
        deal_id: dealId,         // Added: Supports interactive NDA & Deal structures
      })
      .select(`
        *,
        profiles (
          id,
          full_name,
          username,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ message: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}