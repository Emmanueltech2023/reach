import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, senderId, senderName, recipientId, recipientName, projectName } = await req.json();

    if (!conversationId || !senderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Structured NDA JSON payload
    const ndaPayload = JSON.stringify({
      type: "nda_request",
      senderId,
      senderName: senderName || "Founder",
      recipientId: recipientId || null,
      recipientName: recipientName || "Investor",
      projectName: projectName || "Investment Project",
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: ndaPayload,
        message_type: "system",
        delivery_status: "sent",
      })
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier)`)
      .single();

    if (error) throw error;

    // Send notifications to recipient
    try {
      let targetRecipientId = recipientId;
      if (!targetRecipientId) {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", senderId);
        if (participants && participants.length > 0) {
          targetRecipientId = participants[0].user_id;
        }
      }

      if (targetRecipientId) {
        await supabase.from("notifications").insert({
          user_id: targetRecipientId,
          title: `📋 NDA Request from ${senderName}`,
          body: `${senderName} requested you sign a Mutual Non-Disclosure Agreement before continuing discussions.`,
          type: "message",
          action_url: `/dashboard/chats?conversationId=${conversationId}`,
        });

        const { data: authUser } = await supabase.auth.admin.getUserById(targetRecipientId);
        if (authUser?.user?.email) {
          sendEmail({
            to: authUser.user.email,
            subject: `📋 Mutual NDA Request from ${senderName} — REACH`,
            html: emailTemplates.newMessage(
              recipientName || "Member",
              senderName,
              `${senderName} has sent you a Mutual Non-Disclosure Agreement to review and sign.`
            ),
          }).catch((err) => console.error("NDA notification email failed:", err));
        }
      }
    } catch (notifErr) {
      console.warn("NDA notification dispatch warning:", notifErr);
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create NDA request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}