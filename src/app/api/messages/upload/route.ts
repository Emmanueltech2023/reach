import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

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

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect resource type
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
    const isAudio = file.type.startsWith("audio/") || /\.(webm|mp3|wav|ogg|m4a|aac)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/i.test(file.name);
    const resourceType = isImage ? "image" : isAudio || isVideo ? "video" : "auto";

    const uploadResult = await uploadBufferToCloudinary(buffer, {
      folder: `reach/chat_${conversationId.slice(0, 8)}`,
      resource_type: resourceType,
    });

    // Set message_type strictly to 'file' to satisfy the PostgreSQL constraint
    const fileUrl = uploadResult.secure_url || uploadResult.url;

    // Save message to database
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: isAudio ? "Voice note" : file.name,
        message_type: "file",
        file_url: fileUrl,
        file_name: file.name,
        delivery_status: "sent",
      })
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier)`)
      .single();

    if (msgError) throw msgError;

    // Notify recipient in background
    try {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", senderId);

      if (participants && participants.length > 0) {
        const recipientId = participants[0].user_id;
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", senderId)
          .single();

        const senderName = senderProfile?.full_name || "Someone";
        const label = isAudio ? "sent a voice note" : isImage ? "sent an image" : `sent a document: ${file.name}`;

        await supabase.from("notifications").insert({
          user_id: recipientId,
          title: `New message from ${senderName}`,
          body: `${senderName} ${label}`,
          type: "message",
          action_url: `/dashboard/chats?conversationId=${conversationId}`,
        });
      }
    } catch (notifErr) {
      console.warn("Could not dispatch attachment notification:", notifErr);
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    console.error("Chat upload failed with Cloudinary:", err);
    const message = err instanceof Error ? err.message : "Chat file upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}