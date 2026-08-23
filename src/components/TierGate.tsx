"use client";

import { useRouter } from "next/navigation";
import { Lock, Zap, Sparkles, ArrowRight } from "lucide-react";
import { normalizeTier, type Tier } from "@/hooks/useSubscription";

interface Props {
  requiredTier: "pro" | "premium";
  currentTier: string | Tier;
  featureName: string;
  featureDesc: string;
  children: React.ReactNode;
}

export default function TierGate({
  requiredTier,
  currentTier,
  featureName,
  featureDesc,
  children,
}: Props) {
  const router = useRouter();
  const normalized = normalizeTier(currentTier);

  const hasAccess =
    normalized === "premium" ||
    (requiredTier === "pro" && normalized === "pro");

  if (hasAccess) return <>{children}</>;

  const isPremiumGate = requiredTier === "premium";

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 text-center max-w-sm mx-auto">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
        isPremiumGate
          ? "bg-[#C9A84C10] border border-[#C9A84C30]"
          : "bg-blue-900/20 border border-blue-800"
      }`}>
        <Lock size={24} className={isPremiumGate ? "text-[#C9A84C]" : "text-blue-400"} />
      </div>

      <div>
        <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border mb-3 ${
          isPremiumGate
            ? "bg-[#C9A84C10] text-[#C9A84C] border-[#C9A84C30]"
            : "bg-blue-900/20 text-blue-400 border-blue-800"
        }`}>
          {isPremiumGate ? <Sparkles size={12} /> : <Zap size={12} />}
          {isPremiumGate ? "Premium" : "Pro"} feature
        </div>
        <h2 className="text-[#F5F3ED] text-lg font-medium mb-2">{featureName}</h2>
        <p className="text-[#5C5A70] text-sm leading-relaxed">{featureDesc}</p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={() => router.push("/dashboard/upgrade")}
          className={`w-full flex items-center justify-center gap-2 font-medium text-sm py-3 rounded-xl transition ${
            isPremiumGate
              ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          Upgrade to {isPremiumGate ? "Premium" : "Pro"}
          <ArrowRight size={15} />
        </button>
        <button
          onClick={() => router.back()}
          className="w-full border border-[#3A3A52] text-[#A8A6B8] text-sm py-2.5 rounded-xl hover:bg-[#1A1A2E] transition"
        >
          Go back
        </button>
      </div>
    </div>
  );
}