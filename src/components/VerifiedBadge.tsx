import React from "react";

export type BadgeTier = "pro" | "premium" | "verified" | "gold" | "blue" | string | null | undefined;

interface VerifiedBadgeProps {
  tier?: BadgeTier;
  isVerified?: boolean;
  isScam?: boolean;
  isBanned?: boolean;
  size?: number; // pixel width & height (default 16)
  className?: string;
  showTooltip?: boolean;
}

/**
 * X (Twitter) Style Verified Checkmark Badges:
 * - Blue Tick (#1D9BF0): Pro Subscribers & Verified Individuals
 * - Gold Tick (#E2B714 / #C9A84C): Premium Subscribers & Official Organizations / VCs
 * - Emerald Tick (#10B981): Verified Identity / KYC Approved
 * - Scam Alert (#EF4444): Admin-flagged Fraud / Scam warning
 * - Suspended (#71717A): Admin-suspended account
 */
export default function VerifiedBadge({
  tier,
  isVerified,
  isScam,
  isBanned,
  size = 16,
  className = "",
  showTooltip = true,
}: VerifiedBadgeProps) {
  // 0. Scam Flag (Highest priority safety alert)
  if (isScam) {
    return (
      <span
        title={showTooltip ? "⚠️ Warning: Account Flagged for Suspicious / Fraudulent Activity" : undefined}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.35)] select-none shrink-0 align-middle ${className}`}
      >
        <span>⚠️ SCAM ALERT</span>
      </span>
    );
  }

  // 0b. Banned / Suspended
  if (isBanned) {
    return (
      <span
        title={showTooltip ? "Account Suspended by Platform Administration" : undefined}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800/90 text-zinc-400 border border-zinc-600 select-none shrink-0 align-middle ${className}`}
      >
        <span>🚫 SUSPENDED</span>
      </span>
    );
  }

  const normalizedTier = (tier || "").toLowerCase().trim();

  // Determine badge type
  const isPremium = normalizedTier === "premium" || normalizedTier === "gold";
  const isPro = normalizedTier === "pro" || normalizedTier === "blue";
  const hasKyc = isVerified || normalizedTier === "verified";

  // If user has no tier and is not verified, render nothing
  if (!isPremium && !isPro && !hasKyc) {
    return null;
  }

  // 1. Gold Badge (Premium / Top Investor / Organization)
  if (isPremium) {
    return (
      <span
        title={showTooltip ? "Verified Premium Member" : undefined}
        className={`inline-flex items-center justify-center shrink-0 align-middle select-none transition-transform hover:scale-110 cursor-help ${className}`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Authentic X-style Scalloped Starburst Badge Shape */}
          <path
            d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
            fill="#E2B714"
          />
          {/* Inner Checkmark */}
          <path
            d="M9.9 16.6l-3.5-3.5 1.4-1.4 2.1 2.1 6.3-6.3 1.4 1.4-7.7 7.7z"
            fill="#0F0F1A"
            stroke="#0F0F1A"
            strokeWidth="0.5"
          />
        </svg>
      </span>
    );
  }

  // 2. Blue Badge (Pro Subscriber)
  if (isPro) {
    return (
      <span
        title={showTooltip ? "Verified Pro Subscriber" : undefined}
        className={`inline-flex items-center justify-center shrink-0 align-middle select-none transition-transform hover:scale-110 cursor-help ${className}`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Authentic X-style Scalloped Starburst Badge Shape */}
          <path
            d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
            fill="#1D9BF0"
          />
          {/* Inner Checkmark */}
          <path
            d="M9.9 16.6l-3.5-3.5 1.4-1.4 2.1 2.1 6.3-6.3 1.4 1.4-7.7 7.7z"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.5"
          />
        </svg>
      </span>
    );
  }

  // 3. Basic Verified Badge (KYC Approved / Identity Verified)
  return (
    <span
      title={showTooltip ? "Verified Identity" : undefined}
      className={`inline-flex items-center justify-center shrink-0 align-middle select-none transition-transform hover:scale-110 cursor-help ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
          fill="#10B981"
        />
        <path
          d="M9.9 16.6l-3.5-3.5 1.4-1.4 2.1 2.1 6.3-6.3 1.4 1.4-7.7 7.7z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="0.5"
        />
      </svg>
    </span>
  );
}
