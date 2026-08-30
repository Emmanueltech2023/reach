import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getUserTier, getTierRules } from "@/lib/tierCheck";
import { moderateContent } from "./moderate/route";
import { handleConciergeQuery } from "@/lib/conciergeBot";
import { checkRateLimit } from "@/lib/rateLimit";

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

    // Rate Limiting Protection (Max 30 messages per minute per user)
    const limit = checkRateLimit(`msg-limit:${senderId}`, 30, 60 * 1000);
    if (!limit.success) {
      return NextResponse.json(
        { error: `You are sending messages too quickly. Please wait ${limit.reset} seconds.` },
        { status: 429 }
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

    // 3. Proceed with Insertion (normalize to allowed 'text' | 'file' | 'system')
    const validType = ["text", "file", "system"].includes(messageType) ? messageType : "text";

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: validType,
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
          is_verified,
          subscription_tier
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

        // Check if recipient is concierge/admin and respond automatically
        const { data: recipientRole } = await supabase
          .from("profiles")
          .select("role, id")
          .eq("id", recipientId)
          .maybeSingle();

        if (recipientRole?.role === "admin" && content) {
          const conciergeReply = handleConciergeQuery(content);
          
          // Auto-insert Concierge reply after 800ms delay
          setTimeout(async () => {
            try {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: recipientId,
                content: conciergeReply.reply,
                message_type: "text",
                delivery_status: "sent",
              });

              await supabase.from("conversations").update({
                last_message_content: conciergeReply.reply,
                last_message_at: new Date().toISOString(),
              }).eq("id", conversationId);
            } catch (conciergeErr) {
              console.warn("Concierge response notice:", conciergeErr);
            }
          }, 800);
        }
      }
    }

    return NextResponse.json({ message: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { messageId, senderId, content } = await req.json();

    if (!messageId || !senderId || !content?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify sender ownership
    const { data: existing, error: findError } = await supabase
      .from("messages")
      .select("id, sender_id, message_type")
      .eq("id", messageId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existing.sender_id !== senderId) {
      return NextResponse.json({ error: "Unauthorized to edit this message" }, { status: 403 });
    }

    // Run moderation
    const modData = moderateContent(content);
    if (modData.flagged && !modData.warningOnly) {
      return NextResponse.json({ error: modData.reason, moderated: true }, { status: 422 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("messages")
      .update({
        content: content.trim(),
        is_edited: true,
      })
      .eq("id", messageId)
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier)`)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ message: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to edit message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { messageId, senderId } = await req.json();

    if (!messageId || !senderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify sender ownership
    const { data: existing, error: findError } = await supabase
      .from("messages")
      .select("id, sender_id")
      .eq("id", messageId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existing.sender_id !== senderId) {
      return NextResponse.json({ error: "Unauthorized to delete this message" }, { status: 403 });
    }

    // Mark as deleted (soft delete preserving conversation flow)
    const { data: deleted, error: delError } = await supabase
      .from("messages")
      .update({
        content: "This message was deleted",
        is_deleted: true,
        file_url: null,
      })
      .eq("id", messageId)
      .select()
      .single();

    if (delError) {
      // Fallback to hard delete if is_deleted column doesn't exist
      await supabase.from("messages").delete().eq("id", messageId);
    }

    return NextResponse.json({ success: true, messageId, message: deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}