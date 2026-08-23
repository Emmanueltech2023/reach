import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔔 1. HANDLE GET: Fetch notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user && user.id !== userId) {
        return NextResponse.json({ error: "Unauthorized access to notifications" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: safeError.message }, { status: 500 });
  }
}

// 🔑 2. HANDLE PATCH: Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, userId } = body;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && userId) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user && user.id !== userId) {
        return NextResponse.json({ error: "Unauthorized operation" }, { status: 403 });
      }
    }

    // Case A: Mark a single notification as read
    if (notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Case B: Mark ALL notifications as read for a user
    if (userId) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing notificationId or userId" }, { status: 400 });
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    console.error("🚨 PATCH ROUTE CRASH:", safeError);
    return NextResponse.json({ error: safeError.message }, { status: 500 });
  }
}

// 🗑️ 3. HANDLE DELETE: Delete a single notification or clear all read notifications
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("notificationId");
    const userId = searchParams.get("userId");
    const onlyRead = searchParams.get("onlyRead") === "true";

    // Case A: Delete specific notification
    if (notificationId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
      return NextResponse.json({ success: true, deleted: notificationId });
    }

    // Case B: Clear read notifications for a user
    if (userId && onlyRead) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .eq("is_read", true);

      if (error) throw error;
      return NextResponse.json({ success: true, clearedRead: true });
    }

    // Case C: Clear all notifications for a user
    if (userId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      return NextResponse.json({ success: true, clearedAll: true });
    }

    return NextResponse.json({ error: "Missing notificationId or userId" }, { status: 400 });
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    console.error("🚨 DELETE NOTIFICATION ERROR:", safeError);
    return NextResponse.json({ error: safeError.message }, { status: 500 });
  }
}