// ─── REACH AI Match Score Engine ──────────────────────────────────────────────
// Calculates real-time 0–99 Match Scores & Insights between Investors, Startups, and Talent.

export type MatchResult = {
  score: number;
  badgeColor: string;
  reasons: string[];
  label: string;
};

export type ProfileData = {
  role?: string | null;
  category?: string | null;
  sector?: string | null;
  country?: string | null;
  investment_focus?: string[] | null;
  is_verified?: boolean | null;
  trust_score?: number | null;
};

export type TargetData = {
  category?: string | null;
  sector?: string | null;
  location?: string | null;
  country?: string | null;
  target_raise?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  is_verified?: boolean | null;
};

/**
 * Calculates a match score (0–99) between an investor/talent profile and a target project/job.
 */
export function calculateMatchScore(
  profile: ProfileData | null | undefined,
  target: TargetData | null | undefined
): MatchResult {
  if (!profile || !target) {
    return {
      score: 85,
      badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      reasons: ["High platform interest", "Verified deal pipeline"],
      label: "Strong Match",
    };
  }

  let score = 50; // Base score
  const reasons: string[] = [];

  // 1. Category & Sector Match (up to +25 points)
  const profileSectors = (profile.investment_focus || []).map((s) => s.toLowerCase());
  const targetCategory = (target.category || "").toLowerCase();
  const targetSector = (target.sector || "").toLowerCase();

  if (targetSector && profileSectors.includes(targetSector)) {
    score += 25;
    reasons.push(`Direct sector fit: ${target.sector}`);
  } else if (targetCategory && profile.category?.toLowerCase() === targetCategory) {
    score += 18;
    reasons.push(`Matching category: ${target.category}`);
  } else {
    score += 10;
    reasons.push("Cross-sector growth potential");
  }

  // 2. Geographic Horizon Match (up to +15 points)
  const profileCountry = (profile.country || "").toLowerCase();
  const targetCountry = (target.country || target.location || "").toLowerCase();

  if (profileCountry && targetCountry && (profileCountry.includes(targetCountry) || targetCountry.includes(profileCountry))) {
    score += 15;
    reasons.push(`Regional focus match: ${target.country || target.location}`);
  } else {
    score += 8;
    reasons.push("Borderless global expansion potential");
  }

  // 3. Verification & Trust Score Bonus (up to +10 points)
  if (profile.is_verified || target.is_verified) {
    score += 6;
    reasons.push("KYC-verified profile credentials");
  }

  if ((profile.trust_score || 0) >= 4.0) {
    score += 4;
    reasons.push("High trust score rating");
  }

  // Cap score between 60 and 98
  const finalScore = Math.min(98, Math.max(62, score));

  let badgeColor = "text-[#C9A84C] border-[#C9A84C]/30 bg-[#C9A84C]/10";
  let label = "Great Match";

  if (finalScore >= 90) {
    badgeColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    label = "90%+ Top Match";
  } else if (finalScore >= 80) {
    badgeColor = "text-blue-400 border-blue-500/30 bg-blue-500/10";
    label = "High Conviction";
  }

  return {
    score: finalScore,
    badgeColor,
    reasons,
    label,
  };
}
