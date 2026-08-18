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
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    const resourceType = isImage ? "image" : isAudio || isVideo ? "video" : "raw";

    const uploadResult = await uploadBufferToCloudinary(buffer, {
      folder: `reach/chat_${conversationId.slice(0, 8)}`,
      resource_type: resourceType,
    });

    // Determine message type
    const messageType = isImage ? "image" : isAudio ? "audio" : "file";

    // Save message to database
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: file.name,
        message_type: messageType,
        file_url: uploadResult.url,
        file_name: file.name,
        delivery_status: "sent",
      })
      .select(`*, profiles(id, full_name, username, avatar_url, is_verified)`)
      .single();

    if (msgError) throw msgError;

    return NextResponse.json({ message });
  } catch (err: unknown) {
    console.error("Chat upload failed with Cloudinary:", err);
    const message = err instanceof Error ? err.message : "Chat file upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}