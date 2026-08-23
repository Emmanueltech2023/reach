import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*, profiles:posted_by(id, full_name, username, avatar_url, is_verified)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { jobId, updates } = await req.json();

    if (!jobId || !updates) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", jobId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
