import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      messageId,
      conversationId,
      signerId,
      signerName,
      signerTitle,
      companyName,
    } = await req.json();

    if (!messageId || !conversationId || !signerId || !signerName) {
      return NextResponse.json(
        { error: "Missing required signature fields" },
        { status: 400 }
      );
    }

    // 1. Fetch existing NDA message
    const { data: existingMsg, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (msgError || !existingMsg) {
      return NextResponse.json({ error: "NDA message not found" }, { status: 404 });
    }

    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(existingMsg.content);
    } catch {
      parsedPayload = { type: "nda_request" };
    }

    const signedAt = new Date().toISOString();
    const updatedPayload = {
      ...parsedPayload,
      status: "signed",
      signerId,
      signerName,
      signerTitle: signerTitle || "Authorized Signer",
      companyName: companyName || "",
      signedAt,
    };

    // 2. Update message payload
    const { data: updatedMsg, error: updateError } = await supabase
      .from("messages")
      .update({
        content: JSON.stringify(updatedPayload),
      })
      .eq("id", messageId)
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier)`)
      .single();

    if (updateError) throw updateError;

    // 3. Post an official confirmation system message into the chat
    const formattedDate = new Date(signedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const confirmationText = `✅ Mutual Non-Disclosure Agreement (NDA) legally executed by ${signerName}${
      companyName ? ` on behalf of ${companyName}` : ""
    } on ${formattedDate}. Full mutual confidentiality protection is now active.`;

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: signerId,
      content: confirmationText,
      message_type: "system",
      delivery_status: "sent",
    });

    // 4. Update deal stage if active deal exists
    try {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("deal_id, project_id")
        .eq("id", conversationId)
        .single();

      if (conversation?.deal_id) {
        await supabase
          .from("deals")
          .update({ stage: "term_sheet", updated_at: signedAt })
          .eq("id", conversation.deal_id);
      }
    } catch (dealErr) {
      console.warn("Deal stage update skipped:", dealErr);
    }

    // 5. Notify the requester
    try {
      const requesterId = parsedPayload.senderId;
      if (requesterId && requesterId !== signerId) {
        await supabase.from("notifications").insert({
          user_id: requesterId,
          title: `✅ NDA Signed by ${signerName}`,
          body: `${signerName} has signed the Mutual NDA. You are now protected under confidential disclosure terms.`,
          type: "message",
          action_url: `/dashboard/chats?conversationId=${conversationId}`,
        });

        const { data: authUser } = await supabase.auth.admin.getUserById(requesterId);
        if (authUser?.user?.email) {
          sendEmail({
            to: authUser.user.email,
            subject: `✅ NDA Signed by ${signerName} — REACH`,
            html: emailTemplates.newMessage(
              parsedPayload.senderName || "Founder",
              signerName,
              `${signerName} has signed your Mutual Non-Disclosure Agreement.`
            ),
          }).catch((e) => console.error("NDA sign email dispatch error:", e));
        }
      }
    } catch (notifErr) {
      console.warn("NDA signature notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: updatedMsg,
      signedPayload: updatedPayload,
    });
  } catch (err: unknown) {
    console.error("NDA sign endpoint error:", err);
    const message = err instanceof Error ? err.message : "Failed to sign NDA";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
