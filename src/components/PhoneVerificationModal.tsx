"use client";

import { useState } from "react";
import { X, Smartphone, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type PhoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialPhone?: string;
  onSuccess: () => void;
};

export default function PhoneVerificationModal({ isOpen, onClose, userId, initialPhone = "", onSuccess }: PhoneModalProps) {
  const [step, setStep] = useState<"input_phone" | "verify_otp">("input_phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setErrorMsg("Please enter valid phone number with country code (e.g. +1234567890)");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/verify/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", userId, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS code");

      if (data.sandboxCode) {
        setSandboxCode(data.sandboxCode);
      }

      setStep("verify_otp");
    } catch (err: any) {
      setErrorMsg(err.message || "SMS delivery failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      setErrorMsg("Please enter 6-digit SMS code");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/verify/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", userId, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired SMS code");

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Phone verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#3A3A52] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F3ED]">Phone Number Verification</h3>
              <p className="text-xs text-[#5C5A70]">SMS OTP Authentication</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white">
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sandboxCode && (
          <div className="p-3 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-xs text-[#C9A84C]">
            💡 Sandbox Test SMS Code: <strong className="font-mono text-white tracking-widest">{sandboxCode}</strong>
          </div>
        )}

        {step === "input_phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Mobile Phone Number (with Country Code)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] font-mono text-sm text-[#F5F3ED] rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Smartphone size={16} /> Send SMS Verification Code</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Enter 6-Digit SMS Code Sent to {phone}</label>
              <input
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-center font-mono text-2xl tracking-[8px] text-[#C9A84C] rounded-xl py-3 outline-none focus:border-[#C9A84C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Confirm Phone Verification</>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
