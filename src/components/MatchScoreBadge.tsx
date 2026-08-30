"use client";

import { useState } from "react";
import { Sparkles, Info, CheckCircle2 } from "lucide-react";
import { calculateMatchScore, ProfileData, TargetData } from "@/lib/matchEngine";

type MatchBadgeProps = {
  profile?: ProfileData | null;
  target?: TargetData | null;
  scoreOverride?: number;
  showTooltip?: boolean;
};

export default function MatchScoreBadge({
  profile,
  target,
  scoreOverride,
  showTooltip = true,
}: MatchBadgeProps) {
  const [open, setOpen] = useState(false);
  const match = calculateMatchScore(profile, target);
  const displayScore = scoreOverride || match.score;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${match.badgeColor}`}
      >
        <Sparkles size={12} className="animate-pulse" />
        <span>{displayScore}% Match</span>
      </button>

      {/* Popover Tooltip Breakdown */}
      {showTooltip && open && (
        <div className="absolute top-full mt-2 right-0 sm:left-0 z-30 w-64 p-3.5 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl shadow-2xl space-y-2.5 text-left text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[#3A3A52] pb-2">
            <span className="font-bold text-[#F5F3ED] flex items-center gap-1">
              <Sparkles size={13} className="text-[#C9A84C]" />
              AI Match Intelligence
            </span>
            <span className="text-[10px] uppercase font-bold text-[#C9A84C]">
              {displayScore}/100 Score
            </span>
          </div>

          <div className="space-y-1.5">
            {match.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#A8A6B8]">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
