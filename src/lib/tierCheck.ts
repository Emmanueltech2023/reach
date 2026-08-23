import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Tier = "free" | "pro" | "premium";

export function normalizeTier(tierStr?: string | null): Tier {
  if (!tierStr) return "free";
  const t = tierStr.toLowerCase().trim();
  if (t === "premium") return "premium";
  if (t === "pro") return "pro";
  return "free";
}

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

  return normalizeTier(data.subscription_tier);
}

export function getTierRules(tier: string | Tier) {
  const normalized = normalizeTier(tier);
  return TIER_RULES[normalized] || TIER_RULES.free;
}

export function tierCanDo(tier: string | Tier, action: keyof typeof TIER_RULES.free): boolean {
  const rules = getTierRules(tier);
  const val = rules[action];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return true;
}