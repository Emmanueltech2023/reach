"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Building2,
  Briefcase,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  Share2,
  Sparkles,
  Users,
  Globe,
  Loader2,
  Lock,
} from "lucide-react";

function WaitlistInner() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref") || "";

  const [role, setRole] = useState<"investor" | "builder" | "talent">("investor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");

  // Investor specific
  const [ticketSize, setTicketSize] = useState("$25k - $100k");
  const [selectedSectors, setSelectedSectors] = useState<string[]>(["Fintech", "AI & ML"]);

  // Builder specific
  const [startupName, setStartupName] = useState("");
  const [targetRaise, setTargetRaise] = useState("$250,000");
  const [stage, setStage] = useState("MVP / Early Revenue");

  // Talent specific
  const [skills, setSkills] = useState("Fullstack / Frontend Engineer");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number>(142);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const SECTORS_LIST = [
    "Fintech",
    "AI & ML",
    "Web3 & Crypto",
    "HealthTech",
    "CleanTech / Energy",
    "SaaS / B2B",
    "AgriTech",
    "Logistics",
  ];

  const toggleSector = (s: string) => {
    if (selectedSectors.includes(s)) {
      setSelectedSectors(selectedSectors.filter((x) => x !== s));
    } else {
      setSelectedSectors([...selectedSectors, s]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          role,
          country,
          ticketSize: role === "investor" ? ticketSize : undefined,
          sectors: role === "investor" ? selectedSectors : undefined,
          startupName: role === "builder" ? startupName : undefined,
          targetRaise: role === "builder" ? targetRaise : undefined,
          stage: role === "builder" ? stage : undefined,
          skills: role === "talent" ? skills : undefined,
          referredBy: refParam,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit waitlist application");
      }

      setQueuePosition(data.position || 142);
      setReferralCode(data.referralCode || `RCH-${Math.floor(100000 + Math.random() * 900000)}`);
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission error";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/waitlist?ref=${referralCode}`
    : `https://reachinvestment.com/waitlist?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareOnTwitter = () => {
    const text = `Just applied for private beta access to @REACH — the verified deal room connecting global investors & high-growth founders.\n\nJoin the waitlist here: ${referralUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareOnWhatsApp = () => {
    const text = `Hey! I just applied for private beta access to REACH (curated deal rooms for investors & startup founders). Use my invite link to get priority entry: ${referralUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F3ED] flex flex-col justify-between selection:bg-[#C9A84C] selection:text-[#0A0A0F]">
      {/* Top Header */}
      <header className="border-b border-[#1A1A2E] bg-[#0F0F1A]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-icon.png"
            alt="REACH Logo"
            width={34}
            height={34}
            className="w-8.5 h-8.5 object-contain"
            priority
          />
          <span className="font-extrabold text-base tracking-tight text-[#F5F3ED]">
            R<span className="text-[#C9A84C]">EACH</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] font-bold">
            Private Beta
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-[#A8A6B8] hover:text-[#F5F3ED] transition"
          >
            Already a member? Sign in
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A84C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl relative z-10">
          {!submitted ? (
            /* WAITLIST APPLICATION FORM */
            <div className="bg-[#12121E] border border-[#2A2A3E] rounded-3xl p-6 sm:p-9 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-xs font-bold">
                  Exclusive Early Access
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3ED] tracking-tight">
                  Join the REACH Private Network
                </h1>
                <p className="text-xs sm:text-sm text-[#A8A6B8] max-w-md mx-auto">
                  A high-conviction ecosystem connecting verified Angel/VC Investors, Tech Founders, and Elite Talent across borders.
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#0A0A0F] border border-[#2A2A3E] rounded-2xl">
                {[
                  { id: "investor", label: "Investor / VC", icon: TrendingUp },
                  { id: "builder", label: "Founder", icon: Building2 },
                  { id: "talent", label: "Tech Talent", icon: Briefcase },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = role === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRole(tab.id as any)}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-[#C9A84C] text-[#0A0A0F] shadow-lg shadow-[#C9A84C]/20"
                          : "text-[#8E8CA0] hover:text-[#F5F3ED]"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@fund.com"
                      className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                    Country / Primary Location
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United Kingdom, Nigeria, United States"
                    className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                  />
                </div>

                {/* Role Specific Fields */}
                {role === "investor" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                        Average Investment Ticket Size
                      </label>
                      <select
                        value={ticketSize}
                        onChange={(e) => setTicketSize(e.target.value)}
                        className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition cursor-pointer"
                      >
                        <option value="$5k - $25k">$5,000 – $25,000 (Angel / Micro-ticket)</option>
                        <option value="$25k - $100k">$25,000 – $100,000 (Syndicate / Active Angel)</option>
                        <option value="$100k - $500k">$100,000 – $500,000 (Early-Stage VC)</option>
                        <option value="$500k+">$500,000+ (Institutional / Growth Fund)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1.5">
                        Target Investment Sectors
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SECTORS_LIST.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => toggleSector(sec)}
                            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                              selectedSectors.includes(sec)
                                ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                                : "bg-[#0A0A0F] border-[#2A2A3E] text-[#8E8CA0] hover:text-[#F5F3ED]"
                            }`}
                          >
                            {sec}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {role === "builder" && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                          Startup / Project Name
                        </label>
                        <input
                          type="text"
                          required
                          value={startupName}
                          onChange={(e) => setStartupName(e.target.value)}
                          placeholder="e.g. Nexus Pay"
                          className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                          Current Target Raise ($ USD)
                        </label>
                        <input
                          type="text"
                          required
                          value={targetRaise}
                          onChange={(e) => setTargetRaise(e.target.value)}
                          placeholder="e.g. $250,000"
                          className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                        Current Company Stage
                      </label>
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition cursor-pointer"
                      >
                        <option value="Idea / Pitch Deck">Idea Stage (Validating)</option>
                        <option value="MVP / Live Product">MVP Live (Pre-Revenue)</option>
                        <option value="Early Revenue / Traction">Early Traction & Revenue</option>
                        <option value="Scaling / Series Seed">Scaling / Generating Consistent ARR</option>
                      </select>
                    </div>
                  </div>
                )}

                {role === "talent" && (
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-[#A8A6B8] uppercase tracking-wider block mb-1">
                      Primary Expertise / Skill
                    </label>
                    <input
                      type="text"
                      required
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g. Senior Rust Engineer, Smart Contracts, Product Lead"
                      className="w-full bg-[#0A0A0F] border border-[#2A2A3E] text-xs text-[#F5F3ED] rounded-xl px-3.5 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                    />
                  </div>
                )}

                {refParam && (
                  <div className="p-3 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[11px] text-[#C9A84C] flex items-center gap-2">
                    <CheckCircle size={14} />
                    <span>Invited via VIP Referral: <strong>{refParam}</strong> (+Priority Access)</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#C9A84C]/20 transition cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Securing Your Queue Spot…</span>
                    </>
                  ) : (
                    <>
                      <span>Apply for Priority Access</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-[11px] text-[#5C5A70] flex items-center justify-center gap-1.5">
                  <Lock size={12} />
                  <span>Strict KYC & identity compliance enforced on beta onboarding</span>
                </p>
              </div>
            </div>
          ) : (
            /* SUCCESS CONFIRMATION & VIRAL REFERRAL PASS */
            <div className="bg-[#12121E] border border-[#C9A84C]/40 rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/15 border border-[#C9A84C]/40 flex items-center justify-center text-[#C9A84C] mx-auto shadow-lg shadow-[#C9A84C]/25">
                <CheckCircle size={32} />
              </div>

              <div>
                <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
                  Application Received
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3ED] mt-2">
                  You're #{queuePosition} in line!
                </h2>
                <p className="text-xs sm:text-sm text-[#A8A6B8] mt-1 max-w-sm mx-auto">
                  Thank you, <strong>{fullName}</strong>. We are onboarding members in curated weekly batches to preserve high deal signal.
                </p>
              </div>

              {/* VIP Priority Pass Card */}
              <div className="p-5 rounded-2xl bg-[#0A0A0F] border border-[#2A2A3E] space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Skip The Line (VIP Accelerator)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#8E8CA0]">
                    Pass: {referralCode}
                  </span>
                </div>
                <p className="text-xs text-[#A8A6B8] leading-relaxed">
                  Share your personalized invite link with fellow angels, founders, or operators. <strong>For every 3 peers who sign up, you jump 10 spots in line!</strong>
                </p>

                {/* Copy link bar */}
                <div className="flex items-center gap-2 p-2 bg-[#12121E] rounded-xl border border-[#2A2A3E]">
                  <input
                    type="text"
                    readOnly
                    value={referralUrl}
                    className="flex-1 bg-transparent text-xs text-[#F5F3ED] px-2 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>

                {/* Social Sharing Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={shareOnTwitter}
                    className="py-2.5 rounded-xl bg-[#1A1A2E] hover:bg-[#25253A] border border-[#3A3A52] text-xs font-semibold text-[#F5F3ED] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Share2 size={13} className="text-[#C9A84C]" />
                    <span>Share on X</span>
                  </button>
                  <button
                    type="button"
                    onClick={shareOnWhatsApp}
                    className="py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/40 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Share2 size={13} />
                    <span>Share on WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="text-xs text-[#8E8CA0] hover:text-[#F5F3ED] transition underline"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1A2E] bg-[#0A0A0F] px-6 py-4 text-center text-xs text-[#5C5A70]">
        REACH Ecosystem · Resources · Entrepreneurs · Access · Capital · Horizons
      </footer>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
          <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
        </div>
      }
    >
      <WaitlistInner />
    </Suspense>
  );
}
