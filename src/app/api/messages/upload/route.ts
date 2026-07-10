import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const conversationId = formData.get("conversationId") as string;
    const senderId = formData.get("senderId") as string;

    if (!file || !conversationId || !senderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${conversationId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get signed URL (valid for 7 days)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("chat-files")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signedError || !signedData) {
      throw new Error(signedError?.message || "Failed to generate signed asset URL");
    }

    // Save message to database
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: file.name,
        message_type: "file",
        file_url: signedData.signedUrl,
        file_name: file.name,
        delivery_status: "sent", // Modified: Replaced dropped `is_read: false` column
      })
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified)`)
      .single();

    if (msgError) throw msgError;

    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}