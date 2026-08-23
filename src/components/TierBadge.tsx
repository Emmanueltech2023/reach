import React from "react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { type Tier, normalizeTier } from "@/hooks/useSubscription";

interface Props {
  tier?: string | Tier | null;
  size?: "sm" | "md" | "lg" | number;
  variant?: "tick" | "pill";
  className?: string;
}

/**
 * TierBadge:
 * Renders the authentic Twitter/X verified badge (Blue for Pro, Gold for Premium).
 * Default variant="tick" displays the clean icon attached directly to names.
 */
export default function TierBadge({
  tier,
  size = "sm",
  variant = "tick",
  className = "",
}: Props) {
  const normalized = normalizeTier(tier);
  if (!normalized || normalized === "free") return null;

  const isPremium = normalized === "premium";

  // 1. Tick Icon Variant (Twitter / X verified tick badge)
  if (variant === "tick") {
    const pixelSize =
      typeof size === "number"
        ? size
        : size === "sm"
        ? 14
        : size === "md"
        ? 16
        : 20;

    return <VerifiedBadge tier={normalized} size={pixelSize} className={className} />;
  }

  // 2. Pill Variant (if explicitly desired)
  const textClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5"
      : size === "md"
      ? "text-xs px-2.5 py-0.5"
      : "text-sm px-3 py-1";

  if (isPremium) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider ${textClass} rounded-full bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/50 shadow-xs shadow-[#C9A84C]/10 ${className}`}
      >
        <VerifiedBadge tier="premium" size={12} showTooltip={false} />
        Premium
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider ${textClass} rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/40 shadow-xs shadow-blue-500/10 ${className}`}
    >
      <VerifiedBadge tier="pro" size={12} showTooltip={false} />
      Pro
    </span>
  );
}