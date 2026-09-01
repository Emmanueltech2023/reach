"use client";

import { useEffect, useState } from "react";
import { Cookie, X, Check } from "lucide-react";

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("reach_cookie_consent");
    if (!consent) {
      // Small delay before showing banner for smooth UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("reach_cookie_consent", "all");
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem("reach_cookie_consent", "essential");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-[#0F0F1A]/95 border border-[#C9A84C]/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl relative">
        <button
          onClick={handleEssentialOnly}
          className="absolute top-3 right-3 text-[#5C5A70] hover:text-[#F5F3ED] transition"
          aria-label="Close cookie consent banner"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center shrink-0 text-[#C9A84C] shadow-md">
            <Cookie size={20} />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-xs font-bold text-[#F5F3ED]">Cookie & Privacy Preferences</h3>
            </div>
            <p className="text-xs text-[#A8A6B8] leading-relaxed">
              We use essential cookies for secure authentication and optional analytics to enhance your experience across our platform.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#3A3A52]/40">
          <button
            onClick={handleEssentialOnly}
            className="flex-1 py-2 px-3 rounded-xl border border-[#3A3A52] hover:border-[#5C5A70] bg-[#1A1A2E]/60 text-[#A8A6B8] hover:text-[#F5F3ED] font-semibold text-xs transition"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-3 rounded-xl bg-[#C9A84C] text-[#1A1A2E] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition shadow-lg shadow-[#C9A84C]/20"
          >
            <Check size={14} /> Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
