import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { postId, userId, action } = await req.json();

    if (!postId || !userId || !action) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: post } = await supabase
      .from("community_posts")
      .select("like_count")
      .eq("id", postId)
      .single();

    if (action === "like") {
      await supabase
        .from("community_likes")
        .insert({ post_id: postId, user_id: userId });

      await supabase
        .from("community_posts")
        .update({ like_count: (post?.like_count || 0) + 1 })
        .eq("id", postId);

      return NextResponse.json({ liked: true, count: (post?.like_count || 0) + 1 });
    } else {
      await supabase
        .from("community_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      await supabase
        .from("community_posts")
        .update({ like_count: Math.max(0, (post?.like_count || 0) - 1) })
        .eq("id", postId);

      return NextResponse.json({ liked: false, count: Math.max(0, (post?.like_count || 0) - 1) });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}