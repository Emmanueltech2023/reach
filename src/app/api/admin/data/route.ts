import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    // Automatically record real-time audit telemetry for admin access
    void logActivity({
      req,
      actorId: auth.user.id,
      actorName: auth.profile.full_name || auth.profile.username || "Admin User",
      actorEmail: auth.user.email,
      actorRole: "admin",
      actionType: "ADMIN_ACCESS",
      description: "Accessed Enterprise Command Center & telemetry services",
    }).catch(() => {});

    const [
      { data: profiles, error: profError },
      { data: upgrades, error: upError },
      { data: projects, error: projError },
      { data: jobs, error: jobError },
      { data: communityPosts, error: postError },
      { data: waitlist, error: waitlistError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("upgrade_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*, profiles:founder_id(id, full_name, username, is_verified)").order("created_at", { ascending: false }),
      supabase.from("jobs").select("*, profiles:posted_by(id, full_name, username)").order("created_at", { ascending: false }),
      supabase.from("community_posts").select("*, profiles:author_id(id, full_name, username, is_verified)").order("created_at", { ascending: false }),
      supabase.from("waitlist_entries").select("*").order("created_at", { ascending: false }),
    ]);

    if (profError) console.error("Admin API profError:", profError);
    if (upError) console.error("Admin API upError:", upError);
    if (projError) console.error("Admin API projError:", projError);
    if (jobError) console.error("Admin API jobError:", jobError);
    if (postError) console.error("Admin API postError:", postError);
    if (waitlistError) console.warn("Admin API waitlistError (table may need creation):", waitlistError);

    return NextResponse.json({
      profiles: profiles || [],
      upgradeRequests: upgrades || [],
      projects: projects || [],
      jobs: jobs || [],
      communityPosts: communityPosts || [],
      waitlistEntries: waitlist || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load admin data";
    console.error("Admin data endpoint error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
