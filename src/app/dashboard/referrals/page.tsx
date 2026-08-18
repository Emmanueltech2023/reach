"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Users, Copy, CheckCircle, Gift,
  TrendingUp, Loader2, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Referral = {
  id: string;
  status: string;
  reward_applied: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    kyc_status: string;
  } | null;
};

const REWARD_THRESHOLD = 5;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function ReferralsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [commissionCredit, setCommissionCredit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    username: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, username, role")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    // Generate code if not exists
    await fetch("/api/referrals/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    const res = await fetch(`/api/referrals/claim?userId=${user.id}`);
    const data = await res.json();

    setReferrals(data.referrals || []);
    setCode(data.code);
    setCount(data.count || 0);
    setCommissionCredit(data.commissionCredit || 0);
    setLoading(false);
  };

  const referralLink =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/auth/signup?ref=${code}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = Math.min((count / REWARD_THRESHOLD) * 100, 100);
  const rewardUnlocked = commissionCredit > 0;

  return (
    <DashboardShell
      role={profile?.role}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div>
          <h1 className="text-[#F5F3ED] text-lg font-medium">
            Refer & earn
          </h1>
          <p className="text-[#5C5A70] text-xs mt-0.5">
            Refer {REWARD_THRESHOLD} verified users to REACH and earn a {10}% commission credit on your next deal close
          </p>
        </div>

        {/* Reward progress card */}
        <div className={`rounded-2xl p-5 border ${
          rewardUnlocked
            ? "bg-[#C9A84C10] border-[#C9A84C30]"
            : "bg-[#1A1A2E] border-[#3A3A52]"
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift size={16} className={rewardUnlocked ? "text-[#C9A84C]" : "text-[#5C5A70]"} />
                <span className={`text-sm font-medium ${rewardUnlocked ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                  {rewardUnlocked ? "Reward unlocked! 🎉" : "Commission credit reward"}
                </span>
              </div>
              <p className="text-[#5C5A70] text-xs">
                {rewardUnlocked
                  ? `${commissionCredit}% off your next deal commission — applied automatically`
                  : `Refer ${REWARD_THRESHOLD - count} more user${REWARD_THRESHOLD - count === 1 ? "" : "s"} to unlock 10% commission credit`}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-medium ${rewardUnlocked ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                {count}<span className="text-sm text-[#5C5A70]">/{REWARD_THRESHOLD}</span>
              </div>
              <div className="text-[#5C5A70] text-xs">referrals</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-[#2A2A3E] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: rewardUnlocked
                  ? "linear-gradient(90deg, #C9A84C, #E8C96A)"
                  : "linear-gradient(90deg, #3A3A6E, #C9A84C)",
              }}
            />
          </div>

          {/* Milestone markers */}
          <div className="flex justify-between">
            {Array.from({ length: REWARD_THRESHOLD }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`text-xs text-center ${
                  n <= count ? "text-[#C9A84C]" : "text-[#3A3A52]"
                }`}
              >
                {n <= count ? "✓" : n}
              </div>
            ))}
          </div>
        </div>

        {/* Referral link card */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">
            Your referral link
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : (
            <>
              {/* Code display */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-[#0F0F1A] border border-[#3A3A52] rounded-lg px-4 py-2.5">
                  <div className="text-[#5C5A70] text-xs mb-0.5">Your code</div>
                  <div className="text-[#C9A84C] font-mono text-lg font-medium tracking-widest">
                    {code}
                  </div>
                </div>
              </div>

              {/* Full link */}
              <div className="flex gap-2">
                <div className="flex-1 bg-[#0F0F1A] border border-[#3A3A52] rounded-lg px-3 py-2.5 overflow-hidden">
                  <div className="text-[#5C5A70] text-xs truncate font-mono">
                    {referralLink}
                  </div>
                </div>
                <button
                  onClick={copyLink}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition flex-shrink-0 ${
                    copied
                      ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800"
                      : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                  }`}
                >
                  {copied ? (
                    <><CheckCircle size={14} /> Copied!</>
                  ) : (
                    <><Copy size={14} /> Copy link</>
                  )}
                </button>
              </div>

              {/* Share options */}
              <div className="flex gap-2 mt-3">
                {[
                  {
                    label: "Share on X",
                    url: `https://twitter.com/intent/tweet?text=I'm using REACH to connect with verified global investors and entrepreneurs. Join me!&url=${encodeURIComponent(referralLink)}`,
                  },
                  {
                    label: "Share on WhatsApp",
                    url: `https://wa.me/?text=${encodeURIComponent(`Join me on REACH — the global investment platform: ${referralLink}`)}`,
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#A8A6B8] border border-[#3A3A52] px-3 py-1.5 rounded-lg hover:border-[#5C5A70] transition"
                  >
                    {s.label}
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-4">How it works</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                step: "1",
                title: "Share your link",
                desc: "Send your unique referral link to investors or builders you know",
                icon: ExternalLink,
              },
              {
                step: "2",
                title: "They sign up",
                desc: "Your contact registers and completes KYC verification on REACH",
                icon: Users,
              },
              {
                step: "3",
                title: "You earn credit",
                desc: `Refer ${REWARD_THRESHOLD} verified users to unlock 10% off your next deal commission`,
                icon: TrendingUp,
              },
              {
                step: "4",
                title: "Deal discount applied",
                desc: "When you close a deal, the commission credit is applied automatically",
                icon: Gift,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#C9A84C] text-[#1A1A2E] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <div className="text-[#F5F3ED] text-sm font-medium">{item.title}</div>
                    <div className="text-[#5C5A70] text-xs mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referrals list */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#3A3A52]">
            <h2 className="text-[#F5F3ED] text-sm font-medium">
              Your referrals ({referrals.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users size={24} className="text-[#3A3A52]" />
              <p className="text-[#5C5A70] text-sm">No referrals yet</p>
              <p className="text-[#5C5A70] text-xs">
                Share your link to get started
              </p>
            </div>
          ) : (
            referrals.map((ref, index) => (
              <div
                key={ref.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  index < referrals.length - 1 ? "border-b border-[#3A3A52]" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] flex-shrink-0">
                  {ref.profiles?.full_name?.[0] || "?"}
                </div>
                <div className="flex-1">
                  <div className="text-[#F5F3ED] text-sm font-medium">
                    {ref.profiles?.full_name || "Unknown"}
                  </div>
                  <div className="text-[#5C5A70] text-xs">
                    @{ref.profiles?.username} · {timeAgo(ref.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    ref.status === "rewarded"
                      ? "bg-[#C9A84C20] text-[#C9A84C] border-[#C9A84C30]"
                      : ref.profiles?.kyc_status === "approved"
                      ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                      : "bg-yellow-900/30 text-yellow-400 border-yellow-800"
                  }`}>
                    {ref.status === "rewarded"
                      ? "Rewarded"
                      : ref.profiles?.kyc_status === "approved"
                      ? "Verified"
                      : "Pending KYC"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Terms */}
        <p className="text-[#3A3A52] text-xs text-center leading-relaxed">
          Referral reward applies to your first deal close after reaching {REWARD_THRESHOLD} verified referrals. 
          Referrals must complete KYC verification to count. REACH reserves the right to modify the referral program at any time.
        </p>
      </div>
    </DashboardShell>
  );
}