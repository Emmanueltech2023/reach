"use client";

import Link from "next/link";
import { ShieldAlert, Mail, LogOut, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F3ED] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1A1A2E] border border-red-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-[#F5F3ED] tracking-tight">
            Account Suspended
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A6B8] leading-relaxed">
            Your account has been suspended by platform administration due to security or compliance policy violations.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F0F1A] border border-[#3A3A52] text-xs text-left space-y-2">
          <div className="font-semibold text-[#F5F3ED]">What can you do?</div>
          <p className="text-[#A8A6B8] leading-relaxed">
            If you believe this suspension is a mistake, you can contact our trust and safety compliance desk to submit an appeal.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href="mailto:support@reachinvestment.com?subject=Account%20Suspension%20Appeal"
            className="w-full py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Mail size={14} />
            <span>Contact Support & Appeals</span>
          </a>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-[#0F0F1A] hover:bg-[#2A2A3E] border border-[#3A3A52] text-[#A8A6B8] font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
