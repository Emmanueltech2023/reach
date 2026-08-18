import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const [
      { data: profiles, error: profError },
      { data: upgrades, error: upError },
      { data: projects, error: projError },
      { data: jobs, error: jobError },
      { data: communityPosts, error: postError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("upgrade_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*, profiles:founder_id(id, full_name, username, is_verified)").order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, profiles:posted_by(id, full_name, username)").order("created_at", { ascending: false }),
      supabase.from("community_posts").select("*, profiles:author_id(id, full_name, username, is_verified)").order("created_at", { ascending: false }),
    ]);

    if (profError) console.error("Admin API profError:", profError);
    if (upError) console.error("Admin API upError:", upError);
    if (projError) console.error("Admin API projError:", projError);
    if (jobError) console.error("Admin API jobError:", jobError);
    if (postError) console.error("Admin API postError:", postError);

    return NextResponse.json({
      profiles: profiles || [],
      upgradeRequests: upgrades || [],
      projects: projects || [],
      jobs: jobs || [],
      communityPosts: communityPosts || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load admin data";
    console.error("Admin data endpoint error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
