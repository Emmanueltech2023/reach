"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Globe, ArrowRight, Loader2, TrendingUp, Rocket, Briefcase, Users, Sparkles } from "lucide-react";
import { getCurrencyForCountry } from "@/lib/currency";

const LOCALE_MAP: Record<string, { language: string; currency: string; flag: string }> = {
  en: { language: "English", currency: "USD", flag: "🇺🇸" },
  fr: { language: "Français", currency: "EUR", flag: "🇫🇷" },
  es: { language: "Español", currency: "EUR", flag: "🇪🇸" },
  de: { language: "Deutsch", currency: "EUR", flag: "🇩🇪" },
  pt: { language: "Português", currency: "USD", flag: "🇧🇷" },
  ar: { language: "العربية", currency: "USD", flag: "🇸🇦" },
  zh: { language: "中文", currency: "USD", flag: "🇨🇳" },
  hi: { language: "हिन्दी", currency: "INR", flag: "🇮🇳" },
  ja: { language: "日本語", currency: "JPY", flag: "🇯🇵" },
  ru: { language: "Русский", currency: "USD", flag: "🇷🇺" },
  yo: { language: "Yorùbá", currency: "NGN", flag: "🇳🇬" },
  sw: { language: "Kiswahili", currency: "KES", flag: "🇰🇪" },
};

const ROLE_OPTIONS = [
  {
    id: "investor",
    title: "Investor",
    subtitle: "I want to invest",
    desc: "Discover verified Web2 & Web3 startups, connect with founders, and close deals.",
    icon: TrendingUp,
    badge: "Dealflow & Portfolio",
  },
  {
    id: "builder",
    title: "Startup / Builder",
    subtitle: "I want to raise capital",
    desc: "Showcase your project, upload pitch deck & whitepaper, and raise from global investors.",
    icon: Rocket,
    badge: "Fundraising",
  },
  {
    id: "talent",
    title: "Talent / Job Seeker",
    subtitle: "I want to find a job",
    desc: "Browse Web2 & Web3 roles at top startups, apply directly, and get hired.",
    icon: Briefcase,
    badge: "Career & Roles",
  },
  {
    id: "team",
    title: "Team Member",
    subtitle: "I'm collaborating",
    desc: "Join chats, deal rooms, and meetings as part of an existing startup team.",
    icon: Users,
    badge: "Collaboration",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"detecting" | "region" | "role">("detecting");
  const [detected, setDetected] = useState<{
    language: string;
    currency: string;
    flag: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    async function detect() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            const countryCode = data.country_code.toUpperCase();
            const browserLocale = navigator.language.slice(0, 2);
            const defaultMap = LOCALE_MAP[browserLocale] || LOCALE_MAP["en"];
            const currency = getCurrencyForCountry(countryCode);
            
            const getEmojiFlag = (cc: string) => {
              const codePoints = cc
                .toUpperCase()
                .split('')
                .map(char => 127397 + char.charCodeAt(0));
              return String.fromCodePoint(...codePoints);
            };

            setDetected({
              language: defaultMap.language,
              currency,
              flag: getEmojiFlag(countryCode)
            });
            sessionStorage.setItem("detected_country", countryCode);
            sessionStorage.setItem("detected_currency", currency);
            setStep("region");
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to geo-detect in onboarding, using browser locale fallback:", e);
      }
      
      const browserLocale = navigator.language.slice(0, 2);
      const match = LOCALE_MAP[browserLocale] || LOCALE_MAP["en"];
      setDetected(match);
      setStep("region");
    }

    const timer = setTimeout(() => {
      detect();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (step === "region") {
      setStep("role");
    } else if (step === "role" && selectedRole) {
      sessionStorage.setItem("preferred_role", selectedRole);
      router.push("/auth/signup");
    }
  };

  if (step === "detecting") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B14] px-6 relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-[#C9A84C]/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#0F0F1A] border border-[#C9A84C]/30 flex items-center justify-center shadow-xl shadow-[#C9A84C]/10">
            <span className="text-2xl font-bold text-[#F5F3ED]">
              i<span className="text-[#C9A84C]">V</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[#A8A6B8] text-sm font-medium">
            <Loader2 size={18} className="animate-spin text-[#C9A84C]" />
            Detecting global region & currency preferences…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B14] px-6 py-12 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute w-[500px] h-[500px] bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none top-0 left-1/2 -translate-x-1/2" />
      <div className="absolute w-[300px] h-[300px] bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none bottom-0 right-0" />

      <div className="w-full max-w-md relative z-10">

        {/* Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A2E] border border-[#C9A84C]/20 text-[#C9A84C] text-xs font-semibold mb-3">
            <Sparkles size={12} /> Global Investment Platform
          </div>
          <h1 className="text-3xl font-bold text-[#F5F3ED] tracking-tight">
            i<span className="text-[#C9A84C]">Vest</span>
          </h1>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
            step === "region"
              ? "bg-[#C9A84C] text-[#0A0A0F]"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}>
            {step === "role" ? <CheckCircle size={13} /> : "1"} Region
          </div>
          <div className="w-8 h-0.5 bg-[#3A3A52]" />
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
            step === "role"
              ? "bg-[#C9A84C] text-[#0A0A0F]"
              : "bg-[#1A1A2E] text-[#5C5A70] border border-[#3A3A52]"
          }`}>
            2 Role & Purpose
          </div>
        </div>

        {/* Step 1: Region Detection */}
        {step === "region" && detected && (
          <div className="bg-[#1A1A2E]/90 backdrop-blur-xl border border-[#3A3A52] rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl mb-2 drop-shadow-md">{detected.flag}</div>
              <h2 className="text-[#F5F3ED] text-xl font-bold">
                Welcome to iVest
              </h2>
              <p className="text-[#A8A6B8] text-xs leading-relaxed">
                Smart global detection configured your initial localized settings.
              </p>
            </div>

            <div className="bg-[#0F0F1A] border border-[#3A3A52] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#C9A84C] text-xs font-semibold uppercase tracking-wider">
                <Globe size={14} /> Region Configuration
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#1A1A2E] p-3 rounded-lg border border-[#3A3A52]/50">
                  <div className="text-[#5C5A70] text-[10px] uppercase font-semibold">Language</div>
                  <div className="text-[#F5F3ED] text-sm font-semibold mt-0.5">{detected.language}</div>
                </div>
                <div className="bg-[#1A1A2E] p-3 rounded-lg border border-[#3A3A52]/50">
                  <div className="text-[#5C5A70] text-[10px] uppercase font-semibold">Default Currency</div>
                  <div className="text-[#F5F3ED] text-sm font-semibold mt-0.5">{detected.currency}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#b09342] text-[#0A0A0F] font-bold text-sm py-3.5 rounded-xl hover:opacity-95 transition shadow-lg shadow-[#C9A84C]/20 active:scale-[0.99]"
              >
                Continue with {detected.language}
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => router.push("/onboarding/language")}
                className="w-full border border-[#3A3A52] text-[#A8A6B8] text-sm py-3 rounded-xl hover:bg-[#1A1A2E] hover:text-[#F5F3ED] transition"
              >
                Choose another language
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Role Selection (Investor, Builder, Talent, Team) */}
        {step === "role" && (
          <div className="bg-[#1A1A2E]/90 backdrop-blur-xl border border-[#3A3A52] rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-[#F5F3ED] text-xl font-bold">
                How will you use iVest?
              </h2>
              <p className="text-[#A8A6B8] text-xs">
                Select your primary goal on the platform.
              </p>
            </div>

            <div className="space-y-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 shadow-lg shadow-[#C9A84C]/5"
                        : "border-[#3A3A52] hover:border-[#5C5A70] bg-[#0F0F1A]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-[#C9A84C] text-[#0A0A0F]" : "bg-[#1A1A2E] text-[#A8A6B8]"
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-sm font-bold ${
                          isSelected ? "text-[#C9A84C]" : "text-[#F5F3ED]"
                        }`}>
                          {role.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? "bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30"
                            : "bg-[#1A1A2E] text-[#5C5A70] border-[#3A3A52]"
                        }`}>
                          {role.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#A8A6B8] leading-relaxed">
                        {role.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContinue}
                disabled={!selectedRole}
                className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg ${
                  selectedRole
                    ? "bg-gradient-to-r from-[#C9A84C] to-[#b09342] text-[#0A0A0F] hover:opacity-95 shadow-[#C9A84C]/20 active:scale-[0.99]"
                    : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                }`}
              >
                Continue to sign up
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => router.push("/auth/login")}
                className="w-full text-center text-[#5C5A70] text-xs hover:text-[#A8A6B8] transition py-1"
              >
                Already have an account? <span className="text-[#C9A84C]">Log in</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}