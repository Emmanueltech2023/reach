"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Tier = "free" | "pro" | "premium";

export type TierFeatures = {
  tier: Tier;
  canMessageFirst: boolean;
  canUploadPitchDeck: boolean;
  canViewAnalytics: boolean;
  canAccessDeals: boolean;
  canPostAnonymously: boolean;
  canBrowseAnonymously: boolean;
  canAccessAIMatches: boolean;
  canScheduleMeetings: boolean;
  isPinnedInFeed: boolean;
  hasBadge: boolean;
  badgeType: "none" | "pro" | "premium";
  maxProjects: number;
  maxTeamMembers: number;
  messageLimit: number | null;
  talentIsPriority: boolean;
  talentHasBadge: boolean;
};

const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    tier: "free",
    canMessageFirst: false,
    canUploadPitchDeck: false,
    canViewAnalytics: false,
    canAccessDeals: false,
    canPostAnonymously: false,
    canBrowseAnonymously: false,
    canAccessAIMatches: false,
    canScheduleMeetings: false,
    isPinnedInFeed: false,
    hasBadge: false,
    badgeType: "none",
    maxProjects: 1,
    maxTeamMembers: 2,
    messageLimit: 10,
    talentIsPriority: false,
    talentHasBadge: false,
  },
  pro: {
    tier: "pro",
    canMessageFirst: true,
    canUploadPitchDeck: true,
    canViewAnalytics: true,
    canAccessDeals: true,
    canPostAnonymously: false,
    canBrowseAnonymously: false,
    canAccessAIMatches: true,
    canScheduleMeetings: true,
    isPinnedInFeed: false,
    hasBadge: true,
    badgeType: "pro",
    maxProjects: 5,
    maxTeamMembers: 10,
    messageLimit: null,
    talentIsPriority: true,
    talentHasBadge: true,
  },
  premium: {
    tier: "premium",
    canMessageFirst: true,
    canUploadPitchDeck: true,
    canViewAnalytics: true,
    canAccessDeals: true,
    canPostAnonymously: true,
    canBrowseAnonymously: true,
    canAccessAIMatches: true,
    canScheduleMeetings: true,
    isPinnedInFeed: true,
    hasBadge: true,
    badgeType: "premium",
    maxProjects: -1,
    maxTeamMembers: -1,
    messageLimit: null,
    talentIsPriority: true,
    talentHasBadge: true,
  },
};

export function useSubscription() {
  const supabase = createClient();
  const [features, setFeatures] = useState<TierFeatures>(TIER_FEATURES.free);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (data) {
        const tier: Tier = (data.subscription_tier as Tier) || "free";
        setFeatures(TIER_FEATURES[tier] || TIER_FEATURES.free);
      }

      setLoading(false);
    };

    fetchTier();
  }, [supabase]);

  return { features, loading };
}

export { TIER_FEATURES };