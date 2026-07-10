import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("community_posts")
      .select(`
        *,
        profiles(id, full_name, username, is_verified, avatar_url, subscription_tier)
      `)
      .order("id", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ posts: data });
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: safeError.message || "Error reading posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authorId, title, content, category, isAnonymous, imageUrl } = await req.json();

    if (!authorId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: authorId,
        title: title || null,
        content,
        category: isAnonymous ? "anonymous" : category,
        is_anonymous: isAnonymous || false,
        image_url: imageUrl || null, // 💡 Maps incoming asset link down to database schema column
      })
      .select(`
        *,
        profiles(id, full_name, username, is_verified, avatar_url, subscription_tier)
      `)
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data });
  } catch (error: unknown) {
    const safeError = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: safeError.message || "Error creating post" }, { status: 500 });
  }
}