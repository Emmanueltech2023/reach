import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, userId } = await req.json();

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update messages from 'sent' or 'delivered' to 'read'
    const { error } = await supabase
      .from("messages")
      .update({ delivery_status: "read" }) // Modified: Replaced is_read: true
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)            // Ensure we aren't marking our own messages as read
      .neq("delivery_status", "read");     // Modified: Replaced is_read: false to avoid rewriting already read rows

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}