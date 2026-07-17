import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

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

    if (data) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", senderId);

      if (participants && participants.length > 0) {
        const recipientId = participants[0].user_id;
        
        // Fetch necessary data
        const { data: authUser } = await supabase.auth.admin.getUserById(recipientId);
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", recipientId)
          .single();
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", senderId)
          .single();

        if (authUser?.user?.email && recipientProfile?.full_name) {
          if (messageType === "text") {
            sendEmail({
              to: authUser.user.email,
              subject: `New message from ${senderProfile?.full_name || "Someone"} — iVest`,
              html: emailTemplates.newMessage(
                recipientProfile.full_name,
                senderProfile?.full_name || "Someone",
                content.slice(0, 100) + (content.length > 100 ? "…" : "")
              ),
            }).catch((err) => console.error("Failed to send notification email:", err));
          }
        }
      }
    }

    return NextResponse.json({ message: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}