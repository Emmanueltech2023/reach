"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Blocks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  {
    id: "web2",
    icon: Globe,
    title: "Web2",
    badge: "Traditional",
    description:
      "SaaS, FinTech, HealthTech, EdTech, AgriTech and other traditional internet-based startups and investments.",
    examples: ["SaaS platforms", "Mobile apps", "E-commerce", "FinTech"],
  },
  {
    id: "web3",
    icon: Blocks,
    title: "Web3",
    badge: "Blockchain",
    description:
      "Decentralized apps, DeFi protocols, NFT projects, DAOs, crypto infrastructure and blockchain-based startups.",
    examples: ["DeFi", "NFTs", "DAOs", "Smart contracts"],
  },
];

export default function CategoryPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let redirectPath = "/dashboard/investor";
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          updates: { category: selected },
        }),
      });

      if (prof?.role === "builder") redirectPath = "/dashboard/builder";
      if (prof?.role === "talent") redirectPath = "/dashboard/talent";
    }

    router.push(redirectPath);
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F3ED] mb-1">
            R<span className="text-[#C9A84C]">EACH</span>
          </h1>
          <p className="text-[#A8A6B8] text-sm">What is your primary interest?</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full ${
                  s <= 3 ? "bg-[#C9A84C]" : "bg-[#3A3A52]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Category Cards */}
        <div className="flex flex-col gap-3 mb-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                className={`flex flex-col gap-3 px-4 py-5 rounded-xl border text-left transition ${
                  isSelected
                    ? "border-[#C9A84C] bg-[#C9A84C10]"
                    : "border-[#3A3A52] bg-[#1A1A2E] hover:border-[#5C5A70]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#C9A84C20]" : "bg-[#2A2A3E]"
                    }`}
                  >
                    <Icon
                      size={20}
                      className={isSelected ? "text-[#C9A84C]" : "text-[#A8A6B8]"}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? "text-[#C9A84C]" : "text-[#F5F3ED]"
                        }`}
                      >
                        {cat.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#2A2A3E] text-[#A8A6B8]">
                        {cat.badge}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="#1A1A2E"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <p className="text-[#5C5A70] text-xs leading-relaxed">
                  {cat.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {cat.examples.map((ex) => (
                    <span
                      key={ex}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        isSelected
                          ? "border-[#C9A84C40] text-[#C9A84C] bg-[#C9A84C10]"
                          : "border-[#3A3A52] text-[#5C5A70]"
                      }`}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!selected || loading}
          className={`w-full font-medium text-sm py-3 rounded-lg transition ${
            selected && !loading
              ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
              : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
          }`}
        >
          {loading ? "Saving…" : "Continue"}
        </button>

        <p className="text-center text-[#5C5A70] text-xs mt-4">
          Step 3 of 4 — Category Selection
        </p>
      </div>
    </main>
  );
}