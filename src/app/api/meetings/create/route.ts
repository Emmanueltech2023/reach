import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getUserTier, tierCanDo } from "@/lib/tierCheck";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      conversationId,
      organizerId,
      participantId,
      title,
      agenda,
      scheduledAt,
      timezone,
    } = await req.json();

    if (!organizerId || !title || !scheduledAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    //Tier enforcer check after getting organizerId
const tier = await getUserTier(organizerId);
if (!tierCanDo(tier, "canScheduleMeetings")) {
  return NextResponse.json(
    {
      error: "Meeting scheduling requires a Pro or Premium plan.",
      upgradeRequired: true,
      requiredTier: "pro",
    },
    { status: 403 }
  );
}

    // Create meeting
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        conversation_id: conversationId || null,
        organizer_id: organizerId,
        title,
        agenda: agenda || null,
        scheduled_at: scheduledAt,
        timezone: timezone || "UTC",
        status: "pending",
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // Add organizer as participant
    await supabase.from("meeting_participants").insert({
      meeting_id: meeting.id,
      user_id: organizerId,
      status: "accepted",
    });

    // Add other participant if provided
    if (participantId) {
      await supabase.from("meeting_participants").insert({
        meeting_id: meeting.id,
        user_id: participantId,
        status: "invited",
      });
    }

    const formattedDate = new Date(scheduledAt).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Send system message in chat
    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: organizerId,
        content: `📅 MEETING SCHEDULED\n\n"${title}"\n${formattedDate}\n\nAgenda: ${
          agenda || "No agenda provided"
        }\n\nAll participants will receive email reminders.`,
        message_type: "system",
        delivery_status: "sent",
      });
    }

    // Get organizer info for email
    const { data: organizer } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", organizerId)
      .single();

    // Notify participant if available
    if (participantId) {
      await supabase.from("notifications").insert({
        user_id: participantId,
        title: "New Meeting Scheduled",
        body: `${organizer?.full_name || "Someone"} scheduled a meeting with you for ${formattedDate}`,
        type: "meeting",
        action_url: "/dashboard/meetings",
      });

      const { data: participantAuth } = await supabase.auth.admin.getUserById(participantId);
      const { data: participantProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", participantId)
        .single();

      if (participantAuth?.user?.email) {
        await sendEmail({
          to: participantAuth.user.email,
          subject: `📅 Meeting: ${title} — iVest`,
          html: emailTemplates.meetingInvite(
            participantProfile?.full_name || "User",
            title,
            formattedDate,
            organizer?.full_name || "Someone"
          ),
        }).catch((err) => console.error("Meeting email send error:", err));
      }
    }


    return NextResponse.json({ meeting });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}