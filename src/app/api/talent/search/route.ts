import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const country = searchParams.get("country");

    let query = supabase
      .from("profiles")
      .select("id, full_name, username, role, avatar_url, bio, country, category, is_verified, subscription_tier, trust_score, created_at")
      .eq("role", "talent");

    if (category) {
      query = query.eq("category", category);
    }

    if (country) {
      query = query.ilike("country", `%${country}%`);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    query = query.order("is_verified", { ascending: false }).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
