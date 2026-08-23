import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      profiles (
        id,
        full_name,
        username,
        avatar_url,
        is_verified,
        trust_score,
        subscription_tier
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Derive effective tier from founder profile & project tier
  const tierWeight = (t: string) => {
    if (t === "premium") return 3;
    if (t === "pro") return 2;
    return 1;
  };

  const formattedProjects = (data || []).map((p: any) => {
    const rawFounderTier = p.profiles?.subscription_tier;
    const founderTier = typeof rawFounderTier === "string" ? rawFounderTier.toLowerCase().trim() : "";
    const rawProjectTier = typeof p.tier === "string" ? p.tier.toLowerCase().trim() : "";

    let effectiveTier = "free";
    if (founderTier === "premium" || rawProjectTier === "premium") {
      effectiveTier = "premium";
    } else if (founderTier === "pro" || rawProjectTier === "pro") {
      effectiveTier = "pro";
    }

    return {
      ...p,
      tier: effectiveTier,
    };
  });

  // Strict sorting: Premium -> Pro -> Free, then by newest
  formattedProjects.sort((a: any, b: any) => {
    const diff = tierWeight(b.tier) - tierWeight(a.tier);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ projects: formattedProjects });
}