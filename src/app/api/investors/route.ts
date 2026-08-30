import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const focus = searchParams.get("focus") || "";

    let query = supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified, is_scam, is_banned, country, bio, investment_focus, min_ticket_size, max_ticket_size, total_invested, trust_score, banner_url, is_anonymous, subscription_tier, created_at")
      .eq("role", "investor")
      .order("is_verified", { ascending: false })
      .order("trust_score", { ascending: false })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%,bio.ilike.%${search}%,country.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const investors = (data || []).map((inv) => {
      if (inv.is_anonymous) {
        return {
          ...inv,
          full_name: "Anonymous Investor",
          username: "anonymous",
          avatar_url: null,
          banner_url: null,
          country: null,
          bio: "This institutional investor is operating in anonymous mode.",
        };
      }
      return inv;
    });

    return NextResponse.json({ investors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch investors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
