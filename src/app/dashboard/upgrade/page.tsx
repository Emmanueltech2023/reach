"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import TierBadge from "@/components/TierBadge";
import { normalizeTier } from "@/hooks/useSubscription";
import {
  CheckCircle, X, Loader2, Copy,
  Building2, Wallet, ArrowLeft,
  Sparkles, Zap, Shield,
  MessageCircle, BarChart2,
  Eye, EyeOff, FileText, Star, Lock, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PAYMENT_DETAILS = {
  bankName: "PAYSTACK",
  accountName: "REACH International",
  accountNumber: "0220220220",
  sortCode: "00-00-00",
  usdtAddress: "Your USDT TRC20 address here",
};

type TierFeature = { label: string; included: boolean };

type Tier = {
  id: string;
  name: string;
  price: number;
  desc: string;
  color: string;
  headerBg: string;
  badge: "pro" | "premium" | null;
  popular: boolean;
  cta: string;
  ctaStyle: string;
  features: TierFeature[];
};

const INVESTOR_TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    desc: "Explore the platform",
    color: "border-[#3A3A52]",
    headerBg: "bg-[#1A1A2E]",
    badge: null,
    popular: false,
    cta: "Current plan",
    ctaStyle: "bg-[#2A2A3E] text-[#5C5A70] cursor-default",
    features: [
      { label: "Browse startup listings", included: true },
      { label: "10 messages total", included: true },
      { label: "Basic investor profile", included: true },
      { label: "AI match engine", included: false },
      { label: "Deal pipeline access", included: false },
      { label: "Meeting scheduling", included: false },
      { label: "Anonymous chat & browsing mode", included: false },
      { label: "Priority in investor feed", included: false },
      { label: "Verified investor badge", included: false },
      { label: "Private deal rooms", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    desc: "For active investors deploying capital",
    color: "border-blue-700",
    headerBg: "bg-gradient-to-br from-blue-900/30 to-[#1A1A2E]",
    badge: "pro",
    popular: false,
    cta: "Upgrade to Pro",
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-500",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Unlimited messaging", included: true },
      { label: "AI match engine (scored recs)", included: true },
      { label: "Deal pipeline (NDA to Close)", included: true },
      { label: "Meeting scheduling", included: true },
      { label: "Verified Pro investor badge", included: true },
      { label: "Investment portfolio tracker", included: true },
      { label: "Anonymous chat & browsing mode", included: false },
      { label: "Priority placement in feed", included: false },
      { label: "Private deal rooms", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 25,
    desc: "The complete investor toolkit",
    color: "border-[#C9A84C]",
    headerBg: "bg-gradient-to-br from-[#C9A84C15] to-[#1A1A2E]",
    badge: "premium",
    popular: true,
    cta: "Upgrade to Premium",
    ctaStyle: "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Anonymous chat & deal rooms (toggleable)", included: true },
      { label: "Anonymous browsing & public masking", included: true },
      { label: "Priority placement in all feeds", included: true },
      { label: "Gold premium investor badge", included: true },
      { label: "Private deal rooms", included: true },
      { label: "First access to new listings", included: true },
      { label: "Dedicated support channel", included: true },
      { label: "Early access to new features", included: true },
      { label: "Advanced deal analytics", included: true },
      { label: "Co-investor network access", included: true },
    ],
  },
];

const BUILDER_TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    desc: "List your first project",
    color: "border-[#3A3A52]",
    headerBg: "bg-[#1A1A2E]",
    badge: null,
    popular: false,
    cta: "Current plan",
    ctaStyle: "bg-[#2A2A3E] text-[#5C5A70] cursor-default",
    features: [
      { label: "1 project listing", included: true },
      { label: "Basic project profile", included: true },
      { label: "10 messages total", included: true },
      { label: "2 team members", included: true },
      { label: "Pitch deck upload", included: false },
      { label: "Analytics dashboard", included: false },
      { label: "Deal pipeline access", included: false },
      { label: "Featured in investor feed", included: false },
      { label: "Verified builder badge", included: false },
      { label: "Unlimited team members", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    desc: "For builders actively raising capital",
    color: "border-blue-700",
    headerBg: "bg-gradient-to-br from-blue-900/30 to-[#1A1A2E]",
    badge: "pro",
    popular: false,
    cta: "Upgrade to Pro",
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-500",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Up to 5 project listings", included: true },
      { label: "Pitch deck upload & sharing", included: true },
      { label: "Full analytics dashboard", included: true },
      { label: "Deal pipeline (NDA to Close)", included: true },
      { label: "Meeting scheduling", included: true },
      { label: "Up to 10 team members", included: true },
      { label: "Unlimited messaging", included: true },
      { label: "Verified Pro builder badge", included: true },
      { label: "Pinned listing in feed", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 25,
    desc: "Maximum visibility. Close faster.",
    color: "border-[#C9A84C]",
    headerBg: "bg-gradient-to-br from-[#C9A84C15] to-[#1A1A2E]",
    badge: "premium",
    popular: true,
    cta: "Upgrade to Premium",
    ctaStyle: "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Unlimited project listings", included: true },
      { label: "Unlimited team members", included: true },
      { label: "Pinned at top of investor feed", included: true },
      { label: "Gold premium builder badge", included: true },
      { label: "Anonymous posting in community", included: true },
      { label: "Private due diligence vault", included: true },
      { label: "Priority in AI match results", included: true },
      { label: "Dedicated support channel", included: true },
      { label: "Early access to new features", included: true },
    ],
  },
];

const BUILDER_FEATURE_ICONS = [
  { icon: FileText, label: "Pitch deck upload", pro: true, premium: true },
  { icon: BarChart2, label: "Analytics dashboard", pro: true, premium: true },
  { icon: MessageCircle, label: "Unlimited messaging", pro: true, premium: true },
  { icon: Zap, label: "Deal pipeline", pro: true, premium: true },
  { icon: Star, label: "Pinned in investor feed", pro: false, premium: true },
  { icon: Eye, label: "Anonymous community posts", pro: false, premium: true },
];

const INVESTOR_FEATURE_ICONS = [
  { icon: Sparkles, label: "AI match engine", pro: true, premium: true },
  { icon: MessageCircle, label: "Unlimited messaging", pro: true, premium: true },
  { icon: FileText, label: "Deal pipeline", pro: true, premium: true },
  { icon: EyeOff, label: "Anonymous chat & browsing", pro: false, premium: true },
  { icon: Star, label: "Priority placement", pro: false, premium: true },
  { icon: Lock, label: "Private deal rooms", pro: false, premium: true },
];

const TALENT_TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    desc: "Start your job search",
    color: "border-[#3A3A52]",
    headerBg: "bg-[#1A1A2E]",
    badge: null,
    popular: false,
    cta: "Current plan",
    ctaStyle: "bg-[#2A2A3E] text-[#5C5A70] cursor-default",
    features: [
      { label: "Browse all job listings", included: true },
      { label: "Apply to unlimited jobs", included: true },
      { label: "Basic talent profile", included: true },
      { label: "Resume upload", included: true },
      { label: "Priority visibility to employers", included: false },
      { label: "Verified talent badge", included: false },
      { label: "See new jobs before others", included: false },
      { label: "Profile highlighted to recruiters", included: false },
      { label: "Application read receipts", included: false },
      { label: "Career insights & salary data", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    desc: "Stand out and get hired faster",
    color: "border-[#C9A84C]",
    headerBg: "bg-gradient-to-br from-[#C9A84C15] to-[#1A1A2E]",
    badge: "pro",
    popular: true,
    cta: "Upgrade to Pro",
    ctaStyle: "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Priority visibility to employers", included: true },
      { label: "Verified Pro talent badge", included: true },
      { label: "See new jobs 24h before free users", included: true },
      { label: "Profile highlighted to recruiters", included: true },
      { label: "Application read receipts", included: true },
      { label: "Career insights & salary data", included: true },
      { label: "Priority in search results", included: true },
      { label: "Direct message hiring managers", included: true },
      { label: "Dedicated support channel", included: true },
    ],
  },
];

const TALENT_FEATURE_ICONS = [
  { icon: Star, label: "Priority visibility", pro: true, premium: false },
  { icon: Shield, label: "Verified badge", pro: true, premium: false },
  { icon: Zap, label: "Early job access", pro: true, premium: false },
  { icon: Eye, label: "Recruiter highlights", pro: true, premium: false },
  { icon: MessageCircle, label: "DM hiring managers", pro: true, premium: false },
  { icon: BarChart2, label: "Career insights", pro: true, premium: false },
];

export default function UpgradePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
    role: string;
  } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{
    id: string;
    plan: string;
    reference: string;
    created_at: string;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<"plans" | "payment" | "confirm">("plans");
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "usdt">("bank");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchProfileAndRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, role, subscription_tier")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        const resolved = normalizeTier(data.subscription_tier);
        setCurrentTier(resolved);
      }

      // Check for pending upgrade request
      const reqRes = await fetch("/api/upgrade/request");
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (reqData.request && reqData.request.status === "pending") {
          setPendingRequest(reqData.request);
        } else {
          setPendingRequest(null);
        }
      }
    } catch (e) {
      console.error("Error loading profile / upgrade requests:", e);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchProfileAndRequests();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`upgrade-page-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.subscription_tier !== undefined) {
              const updatedTier = normalizeTier(payload.new.subscription_tier);
              setCurrentTier(updatedTier);
              setPendingRequest(null);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("subscription-updated", {
                    detail: { tier: updatedTier, subscription_tier: updatedTier },
                  })
                );
              }
            }
          }
        )
        .subscribe();
    };

    void setupRealtime();

    const handleSubscriptionEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tier || detail?.subscription_tier) {
        const updatedTier = normalizeTier(detail.tier || detail.subscription_tier);
        setCurrentTier(updatedTier);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("subscription-updated", handleSubscriptionEvent);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("subscription-updated", handleSubscriptionEvent);
      }
    };
  }, [supabase, fetchProfileAndRequests]);

  // Derive tiers and selectedTier AFTER profile is loaded
  const TIERS = profile?.role === "talent" ? TALENT_TIERS : profile?.role === "builder" ? BUILDER_TIERS : INVESTOR_TIERS;
  const FEATURE_ICONS = profile?.role === "talent" ? TALENT_FEATURE_ICONS : profile?.role === "builder" ? BUILDER_FEATURE_ICONS : INVESTOR_FEATURE_ICONS;
  const selectedTier = TIERS.find((t) => t.id === selectedPlanId) ?? null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!reference.trim() || !selectedPlanId || !selectedTier) return;
    setSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not logged in.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/upgrade/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: selectedPlanId,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to submit. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    void fetchProfileAndRequests();
  };

  // Success screen
  if (submitted) {
    return (
      <DashboardShell
        role={profile?.role}
        fullName={profile?.full_name}
        username={profile?.username}
      >
        <div className="max-w-md mx-auto flex flex-col items-center justify-center py-16 gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-900/30 border border-emerald-800 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-[#F5F3ED] text-xl font-medium mb-2">
              Request received!
            </h2>
            <p className="text-[#A8A6B8] text-sm leading-relaxed max-w-xs">
              Our team will verify your payment within 24 hours and activate your{" "}
              <strong className="text-[#F5F3ED]">{selectedTier?.name}</strong> plan.
              You will receive a notification once approved.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => router.push("/dashboard/notifications")}
              className="w-full bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-xl hover:opacity-90 transition"
            >
              Watch for notification
            </button>
            <button
              onClick={() =>
                router.push(
                  profile?.role === "talent"
                    ? "/dashboard/talent"
                    : profile?.role === "builder"
                    ? "/dashboard/builder"
                    : "/dashboard/investor"
                )
              }
              className="w-full border border-[#3A3A52] text-[#A8A6B8] text-sm py-3 rounded-xl hover:bg-[#1A1A2E] transition"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const stepIndex = ["plans", "payment", "confirm"].indexOf(step);

  return (
    <DashboardShell
      role={profile?.role}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          {step !== "plans" && (
            <button
              onClick={() =>
                step === "confirm" ? setStep("payment") : setStep("plans")
              }
              className="flex items-center gap-2 text-[#A8A6B8] text-sm mb-6 hover:text-[#F5F3ED] transition mx-auto"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield size={20} className="text-[#C9A84C]" />
            <h1 className="text-[#F5F3ED] text-2xl font-medium">
              {step === "plans"
                ? profile?.role === "talent"
                  ? "Upgrade your talent plan"
                  : profile?.role === "builder"
                  ? "Upgrade your builder plan"
                  : "Upgrade your investor plan"
                : step === "payment"
                ? "Make your payment"
                : "Confirm payment"}
            </h1>
          </div>
          <p className="text-[#5C5A70] text-sm">
            {step === "plans"
              ? profile?.role === "talent"
                ? "Stand out with recruiter priority, verified Pro badge, and direct hiring manager messaging"
                : profile?.role === "builder"
                ? "Get more listings, analytics, and visibility with investors"
                : "Unlock AI matching, deal access, and anonymous browsing"
              : step === "payment"
              ? `Send exactly $${selectedTier?.price} USD to activate your ${selectedTier?.name} plan`
              : "Enter your transaction reference to complete your upgrade"}
          </p>

          {step === "plans" && currentTier !== "free" && (
            <div className="inline-flex items-center gap-2 mt-3 bg-[#1A1A2E] border border-[#3A3A52] rounded-full px-4 py-1.5 text-xs text-[#A8A6B8]">
              Current plan:{" "}
              <TierBadge tier={currentTier as "free" | "pro" | "premium"} />
            </div>
          )}
        </div>

        {/* Step indicator — only shown after plans */}
        {step !== "plans" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(["plans", "payment", "confirm"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s
                      ? "bg-[#C9A84C] text-[#1A1A2E]"
                      : stepIndex > i
                      ? "bg-emerald-600 text-white"
                      : "bg-[#2A2A3E] text-[#5C5A70]"
                  }`}
                >
                  {stepIndex > i ? <CheckCircle size={13} /> : i + 1}
                </div>
                <span
                  className={`text-xs capitalize hidden sm:block ${
                    step === s ? "text-[#F5F3ED]" : "text-[#5C5A70]"
                  }`}
                >
                  {s}
                </span>
                {i < 2 && <div className="w-6 h-px bg-[#3A3A52]" />}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP: PLANS ── */}
        {step === "plans" && (
          <>
            {/* Pending Request Alert */}
            {pendingRequest && (
              <div className="mb-8 p-4 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-left shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="text-amber-400" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#F5F3ED]">
                      Payment Verification Pending ({pendingRequest.plan.toUpperCase()})
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                      Under Admin Review
                    </span>
                  </div>
                  <p className="text-xs text-[#A8A6B8] mt-1 leading-relaxed">
                    Your upgrade request submitted on{" "}
                    <span className="text-[#F5F3ED]">
                      {new Date(pendingRequest.created_at).toLocaleDateString()}
                    </span>{" "}
                    (Reference: <span className="font-mono text-[#C9A84C] font-semibold">{pendingRequest.reference}</span>) is awaiting admin verification. Your features will activate immediately once confirmed.
                  </p>
                </div>
              </div>
            )}

            {/* Feature icons strip */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {FEATURE_ICONS.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-2 bg-[#1A1A2E] border border-[#3A3A52] rounded-lg px-3 py-2"
                  >
                    <Icon size={13} className="text-[#C9A84C] flex-shrink-0" />
                    <span className="text-[#A8A6B8] text-xs flex-1 truncate">
                      {f.label}
                    </span>
                    <div className="flex gap-1">
                      {f.pro ? (
                        <Zap size={11} className="text-blue-400" />
                      ) : (
                        <Lock size={11} className="text-[#3A3A52]" />
                      )}
                      <Sparkles size={11} className="text-[#C9A84C]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tier cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map((tier) => {
                const isCurrent = currentTier === tier.id;
                const isPendingForThisTier = pendingRequest?.plan === tier.id;
                const isDowngrade = currentTier === "premium" && tier.id === "pro";

                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-2xl border-2 overflow-hidden transition flex flex-col ${
                      isCurrent
                        ? "border-emerald-700 shadow-emerald-950/40 shadow-lg"
                        : isPendingForThisTier
                        ? "border-amber-500/60 shadow-amber-950/30 shadow-lg"
                        : tier.color
                    }`}
                  >
                    {tier.popular && (
                      <div className="bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium text-center py-1.5">
                        ⭐ Most popular
                      </div>
                    )}

                    {/* Header */}
                    <div className={`p-5 ${tier.headerBg}`}>
                      <div className="flex items-center justify-between mb-3">
                        {tier.badge ? (
                          <TierBadge tier={tier.badge} size="md" />
                        ) : (
                          <span className="text-[#5C5A70] text-sm font-medium">
                            Free
                          </span>
                        )}
                        {isCurrent ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700 font-semibold">
                            Active Plan
                          </span>
                        ) : isPendingForThisTier ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                            <Clock size={10} /> Pending
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-medium text-[#F5F3ED]">
                          ${tier.price}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-[#5C5A70] text-sm">/month</span>
                        )}
                      </div>
                      <p className="text-[#5C5A70] text-xs">{tier.desc}</p>
                    </div>

                    {/* Features list */}
                    <div className="p-5 bg-[#0F0F1A] flex flex-col gap-2 flex-1">
                      {tier.features.map((f) => (
                        <div
                          key={f.label}
                          className={`flex items-center gap-2 text-xs ${
                            f.included ? "text-[#A8A6B8]" : "text-[#3A3A52]"
                          }`}
                        >
                          {f.included ? (
                            <CheckCircle
                              size={12}
                              className="text-emerald-400 flex-shrink-0"
                            />
                          ) : (
                            <X
                              size={12}
                              className="text-[#3A3A52] flex-shrink-0"
                            />
                          )}
                          {f.label}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="p-4 bg-[#0F0F1A] border-t border-[#3A3A52]">
                      {isCurrent ? (
                        <div className="w-full text-center text-xs text-emerald-400 font-semibold py-2">
                          ✓ Currently Active
                        </div>
                      ) : isPendingForThisTier ? (
                        <div className="w-full text-center text-xs text-amber-300 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg font-medium">
                          ⏳ Verification Pending
                        </div>
                      ) : isDowngrade ? (
                        <div className="w-full text-center text-xs text-[#5C5A70] py-2">
                          Included in Premium
                        </div>
                      ) : tier.id === "free" ? (
                        <div className="w-full text-center text-xs text-[#5C5A70] py-2">
                          Always free
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPlanId(tier.id);
                            setStep("payment");
                          }}
                          className={`w-full text-sm font-medium py-2.5 rounded-lg transition ${tier.ctaStyle}`}
                        >
                          {tier.cta}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
              {[
                "Manual payment verification within 24 hours",
                "Cancel anytime via admin request",
                "Secure bank transfer or USDT",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 text-xs text-[#5C5A70]"
                >
                  <CheckCircle size={11} className="text-[#C9A84C]" />
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === "payment" && selectedTier && (
          <div className="max-w-md mx-auto flex flex-col gap-4">
            <div className="bg-[#C9A84C10] border border-[#C9A84C30] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[#C9A84C] text-sm font-medium">
                  {selectedTier.name} plan — ${selectedTier.price} USD/month
                </p>
                <p className="text-[#A8A6B8] text-xs mt-0.5">
                  Send the exact amount using one of the methods below
                </p>
              </div>
              <TierBadge tier={selectedTier.badge ?? "pro"} />
            </div>

            {/* Payment method toggle */}
            <div className="flex gap-2">
              {(["bank", "usdt"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition ${
                    paymentMethod === method
                      ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]"
                      : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                  }`}
                >
                  {method === "bank" ? (
                    <><Building2 size={15} /> Bank transfer</>
                  ) : (
                    <><Wallet size={15} /> USDT (TRC20)</>
                  )}
                </button>
              ))}
            </div>

            {/* Bank details */}
            {paymentMethod === "bank" && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-[#F5F3ED] text-sm font-medium">
                  Bank transfer details
                </h3>
                {[
                  { label: "Bank name", value: PAYMENT_DETAILS.bankName },
                  { label: "Account name", value: PAYMENT_DETAILS.accountName },
                  { label: "Account number", value: PAYMENT_DETAILS.accountNumber },
                  { label: "Sort code", value: PAYMENT_DETAILS.sortCode },
                  { label: "Amount", value: `$${selectedTier.price} USD` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1 border-b border-[#3A3A52] last:border-0"
                  >
                    <div>
                      <div className="text-[#5C5A70] text-xs">{item.label}</div>
                      <div className="text-[#F5F3ED] text-sm font-mono mt-0.5">
                        {item.value}
                      </div>
                    </div>
                    <button
                      onClick={() => copy(item.value, item.label)}
                      className="flex items-center gap-1 text-xs text-[#5C5A70] hover:text-[#C9A84C] transition"
                    >
                      <Copy size={12} />
                      {copied === item.label ? "Copied!" : "Copy"}
                    </button>
                  </div>
                ))}
                <div className="bg-[#0F0F1A] rounded-lg px-3 py-2 text-xs text-[#A8A6B8]">
                  Use your registered email as the payment narration/reference
                </div>
              </div>
            )}

            {/* USDT details */}
            {paymentMethod === "usdt" && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-[#F5F3ED] text-sm font-medium">
                  USDT TRC20 address
                </h3>
                <div className="flex items-center gap-2 bg-[#0F0F1A] rounded-lg p-3">
                  <span className="text-[#F5F3ED] text-xs font-mono break-all flex-1">
                    {PAYMENT_DETAILS.usdtAddress}
                  </span>
                  <button
                    onClick={() => copy(PAYMENT_DETAILS.usdtAddress, "usdt")}
                    className="text-[#5C5A70] hover:text-[#C9A84C] transition flex-shrink-0"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-400">
                  ⚠ Send only USDT on TRC20 network. Other tokens or networks
                  will be permanently lost.
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5C5A70]">Amount to send</span>
                  <span className="text-[#C9A84C] font-medium">
                    ${selectedTier.price} USDT
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep("confirm")}
              className="w-full bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-xl hover:opacity-90 transition"
            >
              I've sent the payment →
            </button>
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === "confirm" && selectedTier && (
          <div className="max-w-md mx-auto flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
              <h3 className="text-[#F5F3ED] text-sm font-medium mb-3">
                Payment summary
              </h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#5C5A70]">Plan</span>
                  <span className="text-[#F5F3ED] flex items-center gap-1.5">
                    {selectedTier.name}
                    {selectedTier.badge && (
                      <TierBadge tier={selectedTier.badge} />
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5A70]">Amount</span>
                  <span className="text-[#C9A84C] font-medium">
                    ${selectedTier.price} USD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5A70]">Method</span>
                  <span className="text-[#F5F3ED]">
                    {paymentMethod === "bank" ? "Bank transfer" : "USDT TRC20"}
                  </span>
                </div>
              </div>
            </div>

            {/* Reference input */}
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                Transaction reference / hash *
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  paymentMethod === "bank"
                    ? "e.g. TXN2026071500123"
                    : "e.g. abc123def456..."
                }
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] font-mono"
              />
              <p className="text-[#5C5A70] text-xs mt-1">
                Find this in your bank app or crypto wallet after sending
              </p>
            </div>

            {/* Notes input */}
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                Additional notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything else our team should know…"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 text-xs text-[#A8A6B8] leading-relaxed">
              After submitting, our team verifies your payment within{" "}
              <strong className="text-[#F5F3ED]">24 hours</strong>. Your{" "}
              {selectedTier.name} badge and features activate the moment it is
              approved. You will get a notification and email.
            </div>

            <button
              onClick={handleSubmit}
              disabled={!reference.trim() || submitting}
              className={`w-full font-medium text-sm py-3.5 rounded-xl transition flex items-center justify-center gap-2 ${
                reference.trim() && !submitting
                  ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                  : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <><Loader2 size={15} className="animate-spin" /> Submitting…</>
              ) : (
                "Submit payment confirmation"
              )}
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}