import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Tier = "free" | "pro" | "premium";

export const TIER_RULES = {
  free: {
    maxProjects: 1,
    maxTeamMembers: 2,
    maxMessages: 10,
    canAccessDeals: false,
    canAccessAnalytics: false,
    canAccessAIMatches: false,
    canScheduleMeetings: false,
    canUploadPitchDeck: false,
    canPostAnonymously: false,
    canBrowseAnonymously: false,
    isPinnedInFeed: false,
  },
  pro: {
    maxProjects: 5,
    maxTeamMembers: 10,
    maxMessages: null,
    canAccessDeals: true,
    canAccessAnalytics: true,
    canAccessAIMatches: true,
    canScheduleMeetings: true,
    canUploadPitchDeck: true,
    canPostAnonymously: false,
    canBrowseAnonymously: false,
    isPinnedInFeed: false,
  },
  premium: {
    maxProjects: -1,
    maxTeamMembers: -1,
    maxMessages: null,
    canAccessDeals: true,
    canAccessAnalytics: true,
    canAccessAIMatches: true,
    canScheduleMeetings: true,
    canUploadPitchDeck: true,
    canPostAnonymously: true,
    canBrowseAnonymously: true,
    isPinnedInFeed: true,
  },
};

export async function getUserTier(userId: string): Promise<Tier> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  if (!data) return "free";

  const tier = (data.subscription_tier as Tier) || "free";
  return tier;
}

export function getTierRules(tier: Tier) {
  return TIER_RULES[tier] || TIER_RULES.free;
}

export function tierCanDo(tier: Tier, action: keyof typeof TIER_RULES.free): boolean {
  const rules = getTierRules(tier);
  const val = rules[action];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return true;
}