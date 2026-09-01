"use client";

import { useEffect, useState } from "react";
import { Download, X, Sparkles, Smartphone } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed prompt in this session
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#0F0F1A]/95 border border-[#C9A84C]/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-[#5C5A70] hover:text-[#F5F3ED] transition"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#C9A84C]/50 p-2 shrink-0 flex items-center justify-center shadow-md">
            <img src="/logo-icon.png" alt="REACH App" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-xs font-bold text-[#F5F3ED]">Install REACH App</h3>
              <span className="text-[9px] uppercase font-bold text-[#C9A84C] bg-[#C9A84C]/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles size={10} /> App
              </span>
            </div>
            <p className="text-xs text-[#A8A6B8] leading-relaxed">
              Install REACH on your phone or desktop home screen for 1-click access & instant notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#3A3A52]/40">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 text-xs font-semibold text-[#A8A6B8] hover:text-[#F5F3ED] transition"
          >
            Maybe Later
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-[#C9A84C] text-[#1A1A2E] font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition shadow-lg shadow-[#C9A84C]/20"
          >
            <Download size={14} /> Install Now
          </button>
        </div>
      </div>
    </div>
  );
}
