import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { requireAuth } from "@/lib/auth-server";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
];

const BLOCKED_EXTENSIONS = [
  ".exe", ".sh", ".bat", ".cmd", ".js", ".ts", ".jsx", ".tsx",
  ".html", ".htm", ".php", ".py", ".rb", ".vbs", ".scr", ".jar",
];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || "general";
    const path = (formData.get("path") as string) || "uploads";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check blocked dangerous extensions
    const lowerName = file.name.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      return NextResponse.json(
        { error: "Invalid file format. Executables and script files are strictly blocked." },
        { status: 400 }
      );
    }

    // Check allowed MIME types
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed formats: JPG, PNG, WEBP, GIF, SVG, PDF.` },
        { status: 400 }
      );
    }

    // Limit maximum file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Map bucket/path to clean Cloudinary folder hierarchy
    const cleanFolder = `reach/${bucket.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const cleanFileName = (path || file.name)
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_") || "asset";

    // Detect resource type (raw for pdf/docs, image for photos/media)
    const isDoc = file.type.includes("pdf") || file.type.includes("document") || file.name.endsWith(".pdf");
    const resourceType = isDoc ? "raw" : "image";

    const uploadResult = await uploadBufferToCloudinary(buffer, {
      folder: cleanFolder,
      public_id: `${cleanFileName}_${Date.now()}`,
      resource_type: resourceType,
    });

    return NextResponse.json({
      url: uploadResult.url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (err: unknown) {
    console.error("Cloudinary upload failed in /api/upload/image:", err);
    const message = err instanceof Error ? err.message : "Image upload to Cloudinary failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}