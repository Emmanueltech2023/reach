import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*, profiles:founder_id(id, full_name, username, avatar_url, is_verified)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { projectId, updates } = await req.json();

    if (!projectId || !updates) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
