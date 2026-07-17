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
    const projectId = formData.get("projectId") as string;
    const type = formData.get("type") as string; // "pitch_deck" | "whitepaper"

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOC files are allowed" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${type}/${projectId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("project-assets")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("project-assets")
      .getPublicUrl(fileName);

    const updateField = type === "whitepaper"
      ? { whitepaper_url: data.publicUrl }
      : { pitch_deck_url: data.publicUrl, pitch_deck_name: file.name };

    await supabase
      .from("projects")
      .update(updateField)
      .eq("id", projectId);

    // Trigger AI embedding update
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", id: projectId }),
    }).catch(() => {}); // Non-blocking

    return NextResponse.json({ url: data.publicUrl, name: file.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}