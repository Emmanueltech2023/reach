"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Globe, ArrowRight, Loader2 } from "lucide-react";

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
    label: "I'm an investor",
    desc: "I want to discover and invest in verified startups",
    icon: "📈",
  },
  {
    id: "builder",
    label: "I'm a builder",
    desc: "I want to raise capital from verified global investors",
    icon: "🚀",
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
    const timer = setTimeout(() => {
      const browserLocale = navigator.language.slice(0, 2);
      const match = LOCALE_MAP[browserLocale] || LOCALE_MAP["en"];
      setDetected(match);
      setStep("region");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (step === "region") {
      setStep("role");
    } else if (step === "role" && selectedRole) {
      // Store role preference for the signup page
      sessionStorage.setItem("preferred_role", selectedRole);
      router.push("/auth/signup");
    }
  };

  if (step === "detecting") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6">
        <img src="/logo-icon.png" alt="iVest" className="w-12 h-12 rounded-xl mb-6" />
        <div className="flex items-center gap-3 text-[#A8A6B8] text-sm">
          <Loader2 size={16} className="animate-spin text-[#C9A84C]" />
          Detecting your region…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0F0F1A] px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <img src="/logo-icon.png" alt="iVest" className="w-9 h-9 rounded-lg" />
          <span className="text-lg font-medium text-[#F5F3ED]">
            i<span className="text-[#C9A84C]">Vest</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["region", "role"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step === s
                  ? "bg-[#C9A84C] text-[#1A1A2E]"
                  : (step === "role" && s === "region")
                  ? "bg-emerald-600 text-white"
                  : "bg-[#2A2A3E] text-[#5C5A70]"
              }`}>
                {step === "role" && s === "region"
                  ? <CheckCircle size={12} />
                  : i + 1}
              </div>
              {i === 0 && <div className="w-8 h-px bg-[#3A3A52]" />}
            </div>
          ))}
        </div>

        {/* Region step */}
        {step === "region" && detected && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">{detected.flag}</div>
              <h1 className="text-[#F5F3ED] text-xl font-medium mb-2">
                Welcome to iVest
              </h1>
              <p className="text-[#A8A6B8] text-sm">
                We detected your region settings
              </p>
            </div>

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Globe size={16} className="text-[#C9A84C]" />
                <span className="text-[#F5F3ED] text-sm font-medium">Region settings</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#5C5A70] text-xs">Language</span>
                  <span className="text-[#F5F3ED] text-xs font-medium">{detected.language}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C5A70] text-xs">Currency</span>
                  <span className="text-[#F5F3ED] text-xs font-medium">{detected.currency}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-lg hover:opacity-90 transition mb-3"
            >
              Continue with {detected.language}
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => router.push("/onboarding/language")}
              className="w-full border border-[#3A3A52] text-[#A8A6B8] text-sm py-3 rounded-lg hover:bg-[#1A1A2E] transition"
            >
              Choose a different language
            </button>
          </>
        )}

        {/* Role step */}
        {step === "role" && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-[#F5F3ED] text-xl font-medium mb-2">
                How will you use iVest?
              </h1>
              <p className="text-[#A8A6B8] text-sm">
                Choose your role to personalize your experience
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition ${
                    selectedRole === role.id
                      ? "border-[#C9A84C] bg-[#C9A84C08]"
                      : "border-[#3A3A52] hover:border-[#5C5A70] bg-[#1A1A2E]"
                  }`}
                >
                  <div className="text-2xl shrink-0">{role.icon}</div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium mb-0.5 ${
                      selectedRole === role.id ? "text-[#C9A84C]" : "text-[#F5F3ED]"
                    }`}>
                      {role.label}
                    </div>
                    <div className="text-xs text-[#5C5A70] leading-relaxed">
                      {role.desc}
                    </div>
                  </div>
                  {selectedRole === role.id && (
                    <CheckCircle size={16} className="text-[#C9A84C] shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedRole}
              className={`w-full flex items-center justify-center gap-2 font-medium text-sm py-3 rounded-lg transition ${
                selectedRole
                  ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                  : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
              }`}
            >
              Continue to sign up
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => router.push("/auth/login")}
              className="w-full text-center text-[#5C5A70] text-xs mt-4 hover:text-[#A8A6B8] transition"
            >
              Already have an account? Log in
            </button>
          </>
        )}
      </div>
    </main>
  );
}