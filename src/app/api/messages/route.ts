import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getUserTier, getTierRules } from "@/lib/tierCheck";
import { moderateContent } from "./moderate/route";

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

    // 2. Add Tier Enforcement Check (After getting senderId)
    const tier = await getUserTier(senderId);
    const rules = getTierRules(tier);

    if (rules.maxMessages !== null) {
      // Rolling 30-day window for monthly free limit reset
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error: countError } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", senderId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (countError) throw countError;

      if ((count || 0) >= rules.maxMessages) {
        return NextResponse.json(
          {
            error: "You have reached your 10 monthly messages on the free plan. Limits refresh automatically each month, or upgrade to Pro for unlimited messaging.",
            upgradeRequired: true,
            requiredTier: "pro",
          },
          { status: 403 }
        );
      }
    }

      // Run moderation on text messages only
      if (messageType === "text" && content) {
        const modData = moderateContent(content);

        if (modData.flagged && !modData.warningOnly) {
          // Hard block — don't save
          return NextResponse.json(
            {
              error: modData.reason,
              moderated: true,
              warningOnly: false,
            },
            { status: 422 }
          );
        }

        // Log warning-only flags to DB for admin review
        if (modData.flagged && modData.warningOnly) {
          await supabase.from("notifications").insert({
            user_id: senderId,
            title: "Platform policy reminder",
            body: modData.reason,
            type: "general",
          });
        }
      }

    // 3. Proceed with Insertion
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        delivery_status: "sent",
        deal_id: dealId,
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

        const senderName = senderProfile?.full_name || "Someone";
        const preview = content ? (content.slice(0, 100) + (content.length > 100 ? "…" : "")) : "Sent an attachment";

        // Create in-app notification for recipient
        await supabase.from("notifications").insert({
          user_id: recipientId,
          title: `New message from ${senderName}`,
          body: preview,
          type: "message",
          action_url: `/dashboard/chats?conversationId=${conversationId}`,
        });

        // Send email notification
        if (authUser?.user?.email) {
          sendEmail({
            to: authUser.user.email,
            subject: `New message from ${senderName} — REACH`,
            html: emailTemplates.newMessage(
              recipientProfile?.full_name || "User",
              senderName,
              preview
            ),
          }).catch((err) => console.error("Failed to send notification email:", err));
        }
      }
    }

    return NextResponse.json({ message: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}