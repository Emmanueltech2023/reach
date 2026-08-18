import { Sparkles, Zap } from "lucide-react";
import { type Tier } from "@/hooks/useSubscription";

interface Props {
  tier: Tier;
  size?: "sm" | "md";
}

export default function TierBadge({ tier, size = "sm" }: Props) {
  if (tier === "free") return null;

  const isPremium = tier === "premium";
  const iconSize = size === "sm" ? 10 : 13;
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (isPremium) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} px-2 py-0.5 rounded-full font-medium bg-[#C9A84C20] text-[#C9A84C] border border-[#C9A84C40]`}>
        <Sparkles size={iconSize} />
        Premium
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} px-2 py-0.5 rounded-full font-medium bg-blue-900/30 text-blue-400 border border-blue-800`}>
      <Zap size={iconSize} />
      Pro
    </span>
  );
}