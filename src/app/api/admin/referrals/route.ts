import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";
import { logActivity } from "@/lib/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { data: referrals, error } = await supabase
      .from("referrals")
      .select(`
        *,
        referrer:referrer_id(id, full_name, username, avatar_url, referral_code, referral_count),
        referred:referred_id(id, full_name, username, avatar_url, kyc_status, created_at)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Referrals fetch notice:", error.message);
      return NextResponse.json({ referrals: [], topReferrers: [] });
    }

    // Also fetch top referrers
    const { data: topReferrers } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, referral_code, referral_count, commission_credit_pct")
      .gt("referral_count", 0)
      .order("referral_count", { ascending: false })
      .limit(10);

    return NextResponse.json({
      referrals: referrals || [],
      topReferrers: topReferrers || [],
    });
  } catch (err: unknown) {
    return NextResponse.json({ referrals: [], topReferrers: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { referralId, action, status } = await req.json();

    if (!referralId || !action) {
      return NextResponse.json({ error: "Missing referralId or action" }, { status: 400 });
    }

    if (action === "update_status") {
      const { data: updated, error } = await supabase
        .from("referrals")
        .update({ status })
        .eq("id", referralId)
        .select("*")
        .single();

      if (error) throw error;

      // Log activity
      void logActivity({
        req,
        actorId: auth.user.id,
        actorName: auth.profile.full_name || auth.profile.username || "Admin",
        actorEmail: auth.user.email,
        actorRole: "admin",
        actionType: "UPDATE_REFERRAL",
        targetId: referralId,
        description: `Updated referral ${referralId} status to ${status}`,
      }).catch(() => {});

      return NextResponse.json({ success: true, referral: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update referral";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
