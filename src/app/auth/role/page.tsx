"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Rocket, Users, Briefcase, CheckCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  {
    id: "investor",
    icon: TrendingUp,
    title: "Investor",
    description: "Browse verified startups, chat with founders, close deals and track your portfolio.",
  },
  {
    id: "builder",
    icon: Rocket,
    title: "Startup / Builder",
    description: "Upload your project, share your pitch deck, connect with global investors.",
  },
  {
    id: "talent",
    icon: Briefcase,
    title: "Talent / Job Seeker",
    description: "Discover Web2 & Web3 jobs, apply directly, and connect with top hiring startups.",
  },
  {
    id: "team",
    icon: Users,
    title: "Team Member",
    description: "Collaborate on projects, join chats and meetings as part of a startup team.",
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const preferred = sessionStorage.getItem("preferred_role");
      if (preferred) setSelected(preferred);
    }
  }, []);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const detectedCountry = sessionStorage.getItem("detected_country") || "";
      const detectedCurrency = sessionStorage.getItem("detected_currency") || "";

      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          updates: { 
            role: selected,
            ...(detectedCountry && { country: detectedCountry }),
            ...(detectedCurrency && { preferred_currency: detectedCurrency }),
          },
        }),
      });
    }

    router.push(selected === "talent" ? "/dashboard/talent" : "/auth/category");
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B14] px-6 py-12 relative overflow-hidden">
      <div className="absolute w-[450px] h-[450px] bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A2E] border border-[#C9A84C]/20 text-[#C9A84C] text-xs font-semibold mb-3">
            <Sparkles size={12} /> Account Setup
          </div>
          <h1 className="text-2xl font-bold text-[#F5F3ED] mb-1">
            i<span className="text-[#C9A84C]">Vest</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">Select your primary role</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full ${
                  s <= 2 ? "bg-[#C9A84C]" : "bg-[#3A3A52]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-[#1A1A2E]/90 backdrop-blur-xl border border-[#3A3A52] rounded-2xl p-6 shadow-2xl space-y-4 mb-6">
          <div className="flex flex-col gap-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selected === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  className={`flex items-start gap-4 px-4 py-4 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 shadow-lg shadow-[#C9A84C]/5"
                      : "border-[#3A3A52] bg-[#0F0F1A] hover:border-[#5C5A70]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "bg-[#C9A84C] text-[#0A0A0F]" : "bg-[#1A1A2E] text-[#A8A6B8]"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold mb-1 ${isSelected ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                      {role.title}
                    </div>
                    <div className="text-[#A8A6B8] text-xs leading-relaxed">
                      {role.description}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle size={18} className="text-[#C9A84C] shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className={`w-full font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg mt-2 ${
              selected && !loading
                ? "bg-gradient-to-r from-[#C9A84C] to-[#b09342] text-[#0A0A0F] hover:opacity-95 shadow-[#C9A84C]/20 active:scale-[0.99]"
                : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
            }`}
          >
            {loading ? "Saving role preference…" : "Continue to Category"}
          </button>
        </div>

        <p className="text-center text-[#5C5A70] text-xs">
          Step 2 of 4 — Role Selection
        </p>
      </div>
    </main>
  );
}