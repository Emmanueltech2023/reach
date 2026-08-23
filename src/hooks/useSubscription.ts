"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export type Tier = "free" | "pro" | "premium";

export function normalizeTier(tierStr?: string | null): Tier {
  if (!tierStr) return "free";
  const t = tierStr.toLowerCase().trim();
  if (t === "premium") return "premium";
  if (t === "pro") return "pro";
  return "free";
}

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
  const supabase = useMemo(() => createClient(), []);
  const [tier, setTier] = useState<Tier>("free");
  const [features, setFeatures] = useState<TierFeatures>(TIER_FEATURES.free);
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        const resolvedTier = normalizeTier(data.subscription_tier);
        setTier(resolvedTier);
        setFeatures(TIER_FEATURES[resolvedTier]);
      }
    } catch (e) {
      console.error("Error fetching subscription tier:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchTier();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`profile-sub-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.subscription_tier !== undefined) {
              const newTier = normalizeTier(payload.new.subscription_tier);
              setTier(newTier);
              setFeatures(TIER_FEATURES[newTier]);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("subscription-updated", {
                    detail: { tier: newTier, subscription_tier: newTier },
                  })
                );
              }
            }
          }
        )
        .subscribe();
    };

    void setupRealtime();

    const handleSubscriptionEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tier || detail?.subscription_tier) {
        const newTier = normalizeTier(detail.tier || detail.subscription_tier);
        setTier(newTier);
        setFeatures(TIER_FEATURES[newTier]);
      } else {
        void fetchTier();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("subscription-updated", handleSubscriptionEvent);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("subscription-updated", handleSubscriptionEvent);
      }
    };
  }, [supabase, fetchTier]);

  return { tier, features, loading, refetch: fetchTier };
}

export { TIER_FEATURES };