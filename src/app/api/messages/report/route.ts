import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      reporterId,
      reportedUserId,
      conversationId,
      messageId,
      reason,
      details,
    } = await req.json();

    if (!reporterId || !reason) {
      return NextResponse.json(
        { error: "Missing reporterId or reason" },
        { status: 400 }
      );
    }

    // 1. Try to record in reports table if available
    try {
      await supabase.from("reports").insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId || null,
        conversation_id: conversationId || null,
        message_id: messageId || null,
        reason,
        details: details || null,
        status: "pending",
      });
    } catch (tblErr) {
      console.warn("Direct reports table insert skipped:", tblErr);
    }

    // 2. Fetch reporter name for audit alert
    const { data: reporter } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", reporterId)
      .single();

    // 3. Find admins to notify
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const adminNotifs = admins.map((a) => ({
        user_id: a.id,
        title: `🚨 Chat Report: ${reason}`,
        body: `Reported by ${reporter?.full_name || "User"} (@${reporter?.username || "user"}). Reason: ${reason} - ${details || "No additional details"}`,
        type: "general",
        action_url: "/admin",
      }));

      await supabase.from("notifications").insert(adminNotifs);
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully. Our safety team will review it promptly.",
    });
  } catch (err: unknown) {
    console.error("Report submission failed:", err);
    const message = err instanceof Error ? err.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
