"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, X, Loader2, Copy, Building2, Wallet, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants";
import DashboardShell from "@/components/DashboardShell";

export default function UpgradePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<"plans" | "payment" | "confirm">("plans");
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "usdt">("bank");
  const [form, setForm] = useState({ reference: "", notes: "" });
  const [status, setStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [submitted, setSubmitted] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId);
  const [copied, setCopied] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const error = status.error;

  const PAYMENT_DETAILS = {
    bankName: "iVest Banking Ltd.",
    accountName: "iVest Ventures",
    accountNumber: "01234567",
    sortCode: "00-00-00",
    usdtAddress: "TXYZ1234567890abcdef",
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !form.reference.trim()) return;
    setSubmitting(true);
    setStatus({ loading: true, error: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      const response = await fetch("/api/upgrade/request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentMethod,
          reference: form.reference.trim(),
          notes: form.notes.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setStatus({ loading: false, error: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <DashboardShell role="investor">
        <div className="max-w-md mx-auto flex flex-col items-center justify-center py-12 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[#F5F3ED] text-lg font-medium mb-2">
              Request submitted!
            </h2>
            <p className="text-[#A8A6B8] text-sm leading-relaxed">
              Our team will verify your payment within 24 hours and activate your {selectedPlan?.name} plan. You will receive a notification once approved.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/investor")}
            className="bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm px-6 py-3 rounded-lg hover:opacity-90 transition"
          >
            Back to dashboard
          </button>
        </div>
      </DashboardShell>
    );

  }

  return (
    <DashboardShell role="investor">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          {step !== "plans" && (
            <button onClick={() => setStep(step === "confirm" ? "payment" : "plans")}>
              <ArrowLeft size={20} className="text-[#A8A6B8]" />
            </button>
          )}
          <div>
            <h1 className="text-[#F5F3ED] text-lg font-medium">Upgrade your plan</h1>
            <p className="text-[#5C5A70] text-xs mt-0.5">
              {step === "plans" && "Choose a plan that fits your needs"}
              {step === "payment" && "Make your payment"}
              {step === "confirm" && "Confirm your payment"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {["plans", "payment", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s
                  ? "bg-[#C9A84C] text-[#1A1A2E]"
                  : ["plans", "payment", "confirm"].indexOf(step) > i
                  ? "bg-emerald-600 text-white"
                  : "bg-[#2A2A3E] text-[#5C5A70]"
              }`}>
                {["plans", "payment", "confirm"].indexOf(step) > i
                  ? <CheckCircle size={12} />
                  : i + 1}
              </div>
              <span className={`text-xs capitalize ${step === s ? "text-[#F5F3ED]" : "text-[#5C5A70]"}`}>
                {s}
              </span>
              {i < 2 && <div className="w-8 h-px bg-[#3A3A52]" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Plan selection */}
        {step === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`border rounded-xl p-5 cursor-pointer transition ${
                  selectedPlanId === p.id
                    ? "border-[#C9A84C] bg-[#C9A84C08]"
                    : "border-[#3A3A52] bg-[#1A1A2E] hover:border-[#5C5A70]"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`text-base font-medium ${selectedPlanId === p.id ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                      {p.name}
                    </div>
                    <div className="text-2xl font-medium text-[#F5F3ED] mt-1">
                      ${p.price}<span className="text-sm font-normal text-[#5C5A70]">/mo</span>
                    </div>
                  </div>
                  {selectedPlanId === p.id && (
                    <div className="w-5 h-5 rounded-full bg-[#C9A84C] flex items-center justify-center">
                      <CheckCircle size={12} className="text-[#1A1A2E]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                      <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                  {p.notIncluded.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-[#5C5A70]">
                      <X size={12} className="shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              disabled={!selectedPlan}
              onClick={() => setStep("payment")}
              className={`md:col-span-2 w-full font-medium text-sm py-3 rounded-lg transition ${
                selectedPlan
                  ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                  : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
              }`}
            >
              Continue with {selectedPlan ? selectedPlan.name : "a plan"}
            </button>
          </div>
        )}

        {/* Step 2 — Payment details */}
        {step === "payment" && selectedPlan && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#C9A84C20] border border-[#C9A84C30] rounded-xl px-4 py-3">
              <p className="text-[#C9A84C] text-sm font-medium">
                Amount to pay: ${selectedPlan.price} USD ({selectedPlan.name} plan)
              </p>
              <p className="text-[#A8A6B8] text-xs mt-1">
                Choose your preferred payment method below and send the exact amount.
              </p>
            </div>

            {/* Payment method toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("bank")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition ${
                  paymentMethod === "bank"
                    ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]"
                    : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                }`}
              >
                <Building2 size={15} />
                Bank transfer
              </button>
              <button
                onClick={() => setPaymentMethod("usdt")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition ${
                  paymentMethod === "usdt"
                    ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]"
                    : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                }`}
              >
                <Wallet size={15} />
                USDT (TRC20)
              </button>
            </div>

            {/* Bank details */}
            {paymentMethod === "bank" && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-[#F5F3ED] text-sm font-medium">Bank transfer details</h3>
                {[
                  { label: "Bank name", value: PAYMENT_DETAILS.bankName },
                  { label: "Account name", value: PAYMENT_DETAILS.accountName },
                  { label: "Account number", value: PAYMENT_DETAILS.accountNumber },
                  { label: "Sort code", value: PAYMENT_DETAILS.sortCode },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <div className="text-[#5C5A70] text-xs">{item.label}</div>
                      <div className="text-[#F5F3ED] text-sm font-mono mt-0.5">{item.value}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value, item.label)}
                      className="flex items-center gap-1 text-xs text-[#5C5A70] hover:text-[#C9A84C] transition"
                    >
                      <Copy size={12} />
                      {copied === item.label ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ))}
                <div className="bg-[#0F0F1A] rounded-lg px-3 py-2 text-xs text-[#A8A6B8]">
                  Use your email address as the payment reference/narration
                </div>
              </div>
            )}

            {/* USDT details */}
            {paymentMethod === "usdt" && selectedPlan && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-[#F5F3ED] text-sm font-medium">USDT (TRC20) address</h3>
                <div className="flex items-center justify-between bg-[#0F0F1A] rounded-lg px-3 py-3">
                  <span className="text-[#F5F3ED] text-xs font-mono break-all">
                    {PAYMENT_DETAILS.usdtAddress}
                  </span>
                  <button
                    onClick={() => copyToClipboard(PAYMENT_DETAILS.usdtAddress, "usdt")}
                    className="ml-2 shrink-0 text-xs text-[#5C5A70] hover:text-[#C9A84C] transition"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-400">
                  ⚠️ Send only USDT on the TRC20 network. Other tokens or networks will be lost.
                </div>
                <div className="text-[#5C5A70] text-xs">
                  Send exactly <strong className="text-[#C9A84C]">${selectedPlan.price} USDT</strong> to the address above.
                </div>
              </div>
            )}

            <button
              onClick={() => setStep("confirm")}
              className="w-full bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-lg hover:opacity-90 transition"
            >
              I&apos;ve made the payment →
            </button>
          </div>
        )}

        {/* Step 3 — Confirm payment */}
        {step === "confirm" && selectedPlan && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
              <h3 className="text-[#F5F3ED] text-sm font-medium mb-1">Payment summary</h3>
              <p className="text-[#5C5A70] text-xs">
                {selectedPlan.name} plan · ${selectedPlan.price} · {paymentMethod === "bank" ? "Bank transfer" : "USDT TRC20"}
              </p>
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                Transaction reference / hash *
              </label>
              <input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="e.g. TXN123456789 or 0x..."
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
              <p className="text-[#5C5A70] text-xs mt-1">
                Find this in your bank app or crypto wallet after sending
              </p>
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                Additional notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Any additional information about your payment…"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 text-xs text-[#A8A6B8] leading-relaxed">
              After submitting, our team will verify your payment within <strong className="text-[#F5F3ED]">24 hours</strong>. You will receive a notification once your {selectedPlan.name} plan is activated.
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.reference.trim() || submitting}
              className={`w-full font-medium text-sm py-3 rounded-lg transition ${
                form.reference.trim() && !submitting
                  ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                  : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Submitting…
                </span>
              ) : "Submit payment confirmation"}
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}