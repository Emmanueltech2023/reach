"use client";

import { useRouter } from "next/navigation";
import { Lock, Sparkles, Zap } from "lucide-react";
import { type Tier } from "@/hooks/useSubscription";

interface Props {
  requiredTier: "pro" | "premium";
  currentTier: Tier;
  featureName: string;
  featureDesc?: string;
  children: React.ReactNode;
  inline?: boolean;
}

const TIER_CONFIG = {
  pro: {
    label: "Pro",
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-800",
    badge: "bg-blue-900/30 text-blue-400 border-blue-800",
    icon: Zap,
    price: "$15/mo",
  },
  premium: {
    label: "Premium",
    color: "text-[#C9A84C]",
    bg: "bg-[#C9A84C10]",
    border: "border-[#C9A84C30]",
    badge: "bg-[#C9A84C20] text-[#C9A84C] border-[#C9A84C30]",
    icon: Sparkles,
    price: "$25/mo",
  },
};

export default function UpgradeGate({
  requiredTier,
  currentTier,
  featureName,
  featureDesc,
  children,
  inline = false,
}: Props) {
  const router = useRouter();
  const config = TIER_CONFIG[requiredTier];
  const Icon = config.icon;

  const hasAccess =
    currentTier === "premium" ||
    (requiredTier === "pro" && currentTier === "pro");

  if (hasAccess) return <>{children}</>;

  if (inline) {
    return (
      <button
        onClick={() => router.push("/dashboard/upgrade")}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition hover:opacity-80 ${config.badge}`}
      >
        <Icon size={11} />
        {config.label} feature
      </button>
    );
  }

  return (
    <div className={`rounded-xl border p-5 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
          <Lock size={16} className={config.color} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${config.color}`}>
              {featureName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${config.badge}`}>
              {config.label}
            </span>
          </div>
          {featureDesc && (
            <p className="text-[#A8A6B8] text-xs leading-relaxed mb-3">
              {featureDesc}
            </p>
          )}
          <button
            onClick={() => router.push("/dashboard/upgrade")}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition hover:opacity-90 ${config.badge}`}
          >
            <Icon size={12} />
            Upgrade to {config.label} — {config.price}
          </button>
        </div>
      </div>
    </div>
  );
}