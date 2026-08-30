"use client";

import { useState } from "react";
import { X, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type EmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
};

export default function EmailVerificationModal({ isOpen, onClose, userId, userEmail, onSuccess }: EmailModalProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/verify/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", userId, email: userEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email verification code");

      setStep("verify");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch email verification");
    } finally {
      setLoading(false);
    }
  };

  const submitVerification = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length < 6) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/verify/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", userId, code: codeToVerify }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitVerification(code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setCode(val);
    if (val.length === 6 && !loading) {
      void submitVerification(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#3A3A52] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F3ED]">Email Address Verification</h3>
              <p className="text-xs text-[#5C5A70]">{userEmail}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === "request" ? (
          <div className="space-y-4">
            <p className="text-xs text-[#A8A6B8] leading-relaxed">
              We will send a 6-digit confirmation code to your email address <strong className="text-white">{userEmail}</strong>.
            </p>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={16} /> Send Email Verification Code</>}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Enter 6-Digit Confirmation Code</label>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={handleCodeChange}
                placeholder="123456"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-center font-mono text-2xl tracking-[8px] text-[#C9A84C] rounded-xl py-3 outline-none focus:border-[#C9A84C]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Confirm Email Verification</>}
            </button>

            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full text-center text-xs text-[#5C5A70] hover:text-[#A8A6B8] transition cursor-pointer"
            >
              Didn't receive code? Resend
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
