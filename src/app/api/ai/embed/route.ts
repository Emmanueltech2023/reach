import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { type, id } = await req.json();

    if (type === "project") {
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("name, short_description, full_description, sector, category, country")
        .eq("id", id)
        .single();

      if (fetchError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

      const text = [project.name, project.short_description, project.full_description, project.sector, project.category, project.country]
        .filter(Boolean).join(" ");

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      // Supabase 'vector' columns accept raw JSON arrays
      const { error: updateError } = await supabase
        .from("projects")
        .update({ embedding: response.data[0].embedding })
        .eq("id", id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    if (type === "investor") {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("bio, investment_focus, country, min_ticket_size, max_ticket_size")
        .eq("id", id)
        .single();

      if (fetchError || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

      const text = [
        profile.bio,
        ...(Array.isArray(profile.investment_focus) ? profile.investment_focus : []),
        profile.country,
        profile.min_ticket_size ? `min ticket $${profile.min_ticket_size}` : "",
        profile.max_ticket_size ? `max ticket $${profile.max_ticket_size}` : "",
      ].filter(Boolean).join(" ");

      if (!text.trim()) return NextResponse.json({ success: true, skipped: "No content" });

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ embedding: response.data[0].embedding })
        .eq("id", id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Embedding Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}