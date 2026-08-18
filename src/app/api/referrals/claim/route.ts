import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// How many referrals needed for the commission credit reward
const REFERRALS_FOR_REWARD = 5;
const COMMISSION_CREDIT_PCT = 10; // 10% off commission

export async function POST(req: NextRequest) {
  try {
    const { referralCode, newUserId } = await req.json();

    if (!referralCode || !newUserId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find the referrer by code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, full_name, referral_count")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    if (referrer.id === newUserId) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Check not already referred
    const { data: alreadyReferred } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", newUserId)
      .single();

    if (alreadyReferred?.referred_by) {
      return NextResponse.json({ error: "User already has a referrer" }, { status: 400 });
    }

    // Create referral record
    await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      referral_code: referralCode.toUpperCase(),
      status: "signed_up",
    });

    // Mark referred_by on new user
    await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", newUserId);

    // Increment referrer's count
    const newCount = (referrer.referral_count || 0) + 1;
    await supabase
      .from("profiles")
      .update({ referral_count: newCount })
      .eq("id", referrer.id);

    // Check if referrer has hit the reward threshold
    if (newCount >= REFERRALS_FOR_REWARD) {
      const { data: existingCredit } = await supabase
        .from("profiles")
        .select("commission_credit_pct")
        .eq("id", referrer.id)
        .single();

      if ((existingCredit?.commission_credit_pct || 0) < COMMISSION_CREDIT_PCT) {
        await supabase
          .from("profiles")
          .update({ commission_credit_pct: COMMISSION_CREDIT_PCT })
          .eq("id", referrer.id);

        // Notify referrer
        await supabase.from("notifications").insert({
          user_id: referrer.id,
          title: "🎉 Referral reward unlocked!",
          body: `You've referred ${newCount} users to REACH! You now have a ${COMMISSION_CREDIT_PCT}% commission credit applied to your next deal close.`,
          type: "general",
          action_url: "/dashboard/referrals",
        });

        // Mark referrals as rewarded
        await supabase
          .from("referrals")
          .update({ status: "rewarded", reward_applied: true, completed_at: new Date().toISOString() })
          .eq("referrer_id", referrer.id);
      }
    }

    // Add trust points for referral
    await supabase.from("trust_events").insert({
      user_id: referrer.id,
      event_type: "referral_signup",
      points: 5,
      description: `Referred a new user to REACH`,
    });

    return NextResponse.json({ success: true, referrerName: referrer.full_name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data: referrals } = await supabase
      .from("referrals")
      .select(`
        id, status, reward_applied, created_at, completed_at,
        profiles!referrals_referred_id_fkey(full_name, username, kyc_status)
      `)
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, referral_count, commission_credit_pct")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      referrals: referrals || [],
      code: profile?.referral_code,
      count: profile?.referral_count || 0,
      commissionCredit: profile?.commission_credit_pct || 0,
      rewardThreshold: 5,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}