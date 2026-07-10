import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("community_comments")
      .select(`*, profiles(full_name, username, is_verified, avatar_url)`)
      .eq("post_id", postId)
      .eq("is_approved", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ comments: data });
  } catch (error: unknown) {
    console.error("🚨 COMMENT GET CRASH:", error);

    const message = error instanceof Error ? error.message : "GET failure";
    return NextResponse.json({ error: message, rawDetails: error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postId, authorId, content, isAnonymous } = await req.json();

    if (!postId || !authorId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("✈️ Attempting comment insert with data:", { postId, authorId, content, isAnonymous });

    // 1. Insert comment execution
    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        author_id: authorId,
        content,
        is_anonymous: isAnonymous || false,
        is_approved: true,
      })
      .select(`*, profiles(full_name, username, is_verified, avatar_url)`)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase Insert Blocked:", error);
      throw error; // Pushes immediately to the catch block below
    }

    // 2. Counter updates
    try {
      const { error: rpcError } = await supabase.rpc("increment_comment_count", { post_id: postId });
      if (rpcError) throw rpcError;
    } catch (countErr: unknown) {
      const countErrorMessage = countErr instanceof Error ? countErr.message : String(countErr);
      console.warn("⚠️ RPC Counter method failed, attempting manual overwrite fallback:", countErrorMessage);
      
      const { data: post } = await supabase
        .from("community_posts")
        .select("comment_count")
        .eq("id", postId)
        .maybeSingle();

      if (post) {
        await supabase
          .from("community_posts")
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq("id", postId);
      }
    }

    return NextResponse.json({ comment: data });
  } catch (error: unknown) {
    // 💡 This dumps the complete error object directly into your server logs and API response
    const errorDetails = error instanceof Error ? error : new Error(String(error));
    const typedErrorDetails = errorDetails as Error & { code?: string; hint?: string };
    console.error("🚨 COMMENT POST CRASH DETAILS:", JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      {
        error: errorDetails.message || "Internal Server Write Error",
        code: typedErrorDetails.code || "NO_POSTGRES_CODE",
        hint: typedErrorDetails.hint || "Check table schemas and column names",
        rawErrorObject: error,
      },
      { status: 500 }
    );
  }
}