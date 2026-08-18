import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getUserTier, tierCanDo } from "@/lib/tierCheck";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const type = (formData.get("type") as string) || "pitch_deck"; // "pitch_deck" | "whitepaper"

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Add Pitch Deck Enforcement Check
    if (type === "pitch_deck") {
      const { data: project } = await supabase
        .from("projects")
        .select("founder_id")
        .eq("id", projectId)
        .single();

      if (project?.founder_id) {
        const tier = await getUserTier(project.founder_id);
        if (!tierCanDo(tier, "canUploadPitchDeck")) {
          return NextResponse.json(
            {
              error: "Pitch deck upload requires a Pro or Premium plan.",
              upgradeRequired: true,
              requiredTier: "pro",
            },
            { status: 403 }
          );
        }
      }
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF, PPT, and DOC files are allowed" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 25MB." }, { status: 400 });
    }

    // Convert file to buffer and upload to Cloudinary as raw asset
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadBufferToCloudinary(buffer, {
      folder: `reach/projects_${type}`,
      public_id: `${projectId.slice(0, 8)}_${Date.now()}`,
      resource_type: "raw",
    });

    const updateField = type === "whitepaper"
      ? { whitepaper_url: uploadResult.url }
      : { pitch_deck_url: uploadResult.url, pitch_deck_name: file.name };

    await supabase
      .from("projects")
      .update(updateField)
      .eq("id", projectId);

    // Trigger AI embedding update non-blockingly
    if (process.env.NEXT_PUBLIC_APP_URL) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "project", id: projectId }),
      }).catch(() => {});
    }

    return NextResponse.json({ url: uploadResult.url, name: file.name });
  } catch (err: unknown) {
    console.error("Pitch deck upload to Cloudinary error:", err);
    const message = err instanceof Error ? err.message : "Document upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}