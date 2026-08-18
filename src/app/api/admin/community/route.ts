import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: posts, error } = await supabase
      .from("community_posts")
      .select("*, profiles:author_id(id, full_name, username, avatar_url, is_verified)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { postId, updates } = await req.json();

    if (!postId || !updates) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("community_posts")
      .update(updates)
      .eq("id", postId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
