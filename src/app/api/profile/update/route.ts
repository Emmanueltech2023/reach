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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}