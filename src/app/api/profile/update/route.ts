import { NextRequest, NextResponse } from "next/server";
import { requireAuth, adminSupabase as supabase } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json();
    const { userId: bodyUserId, updates } = body;
    const targetUserId = bodyUserId || auth.user.id;

    // Enforce that regular users can only update their own profile
    if (targetUserId !== auth.user.id && auth.profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: You can only edit your own profile." }, { status: 403 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid updates payload" }, { status: 400 });
    }

    // Filter out protected fields to prevent privilege escalation by non-admins
    const sanitizedUpdates: Record<string, any> = { ...updates };
    if (auth.profile.role !== "admin") {
      // Allow initial user role selection (investor, builder, talent), but prevent self-assigning 'admin'
      if (sanitizedUpdates.role && !["investor", "builder", "talent"].includes(sanitizedUpdates.role)) {
        delete sanitizedUpdates.role;
      }
      delete sanitizedUpdates.subscription_tier;
      delete sanitizedUpdates.is_verified;
      delete sanitizedUpdates.kyc_status;
      delete sanitizedUpdates.is_scam;
      delete sanitizedUpdates.is_banned;
      delete sanitizedUpdates.trust_score;
    }

    if (sanitizedUpdates.username) {
      sanitizedUpdates.username = sanitizedUpdates.username.toLowerCase().trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update(sanitizedUpdates)
      .eq("id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If role was just set/updated, ensure user has an in-app Welcome Notification
    if (sanitizedUpdates.role) {
      const userRole = sanitizedUpdates.role;
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", targetUserId)
        .single();

      const userName = userProfile?.full_name || "Member";
      const welcomeBody = userRole === "investor"
        ? "Welcome to REACH! Explore top verified projects, match with AI-recommended startups, and start connecting with founders."
        : userRole === "builder"
        ? "Welcome to REACH! Upload your project workspace, showcase your pitch deck, and start reaching global investors."
        : userRole === "talent"
        ? "Welcome to REACH! Browse Web2 & Web3 career opportunities, apply to top startups, and build your professional network."
        : "Welcome to REACH! Your account is active. Complete your profile to get started.";

      // Check if welcome notification already exists to avoid duplicates
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .ilike("title", "%Welcome%");

      if (count === 0) {
        const { error: insErr } = await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: `Welcome to REACH, ${userName}! 🚀`,
          body: welcomeBody,
          type: "general",
          action_url: "/dashboard/profile",
        });
        if (insErr) console.warn("Role update welcome notification error:", insErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}