"use client";

import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  TrendingUp, CheckCircle, Loader2,
  ChevronRight, FileText, Handshake,
  Trophy, MessageCircle, Plus,
  DollarSign, Calendar, Users,
  ArrowRight, Info, X, Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TierGate from "@/components/TierGate";
import { useSubscription, normalizeTier } from "@/hooks/useSubscription";

type Deal = {
  id: string;
  stage: string;
  amount: number;
  title: string;
  notes: string | null;
  commission_rate: number;
  created_at: string;
  closed_at: string | null;
  investor_id: string;
  projects: {
    id: string;
    name: string;
    short_description: string;
    logo_url: string | null;
    banner_url: string | null;
    category: string;
    sector: string;
    founder_id: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    country: string | null;
  } | null;
};

const STAGES = [
  {
    id: "nda",
    label: "NDA",
    shortLabel: "NDA",
    icon: FileText,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-800",
    dot: "bg-blue-400",
    description: "Non-disclosure agreement stage. Both parties agree to confidentiality before sharing sensitive information.",
  },
  {
    id: "term_sheet",
    label: "Term Sheet",
    shortLabel: "Terms",
    icon: FileText,
    color: "text-purple-400",
    bg: "bg-purple-900/20",
    border: "border-purple-800",
    dot: "bg-purple-400",
    description: "Key investment terms outlined. Includes valuation, equity stake, investment amount and key conditions.",
  },
  {
    id: "agreement",
    label: "Agreement",
    shortLabel: "Agreement",
    icon: Handshake,
    color: "text-[#C9A84C]",
    bg: "bg-[#C9A84C10]",
    border: "border-[#C9A84C30]",
    dot: "bg-[#C9A84C]",
    description: "Final legal agreement being drafted and reviewed. SAFE, equity agreement or convertible note.",
  },
  {
    id: "closed",
    label: "Closed",
    shortLabel: "Closed",
    icon: Trophy,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    border: "border-emerald-800",
    dot: "bg-emerald-400",
    description: "Deal successfully closed. Funds have been committed and agreements signed by all parties.",
  },
];

const STAGE_ORDER = ["nda", "term_sheet", "agreement", "closed"];

function formatCurrency(amount: number) {
  if (!amount) return "$0";
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DealsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { features, tier } = useSubscription();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    username: string;
    role: string;
    subscription_tier?: string;
  } | null>(null);
  const [activeStage, setActiveStage] = useState("all");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [advancingDeal, setAdvancingDeal] = useState<string | null>(null);
  const [showEditAmount, setShowEditAmount] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingAmount, setSavingAmount] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    projectId: "",
    amount: "",
    notes: "",
  });
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [myProjects, setMyProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, subscription_tier")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    const res = await fetch(`/api/deals?userId=${user.id}`);
    const { deals: data } = await res.json();
    setDeals(data || []);

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("is_published", true)
      .limit(50);
    setMyProjects(projects || []);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };

    void load();
  }, [fetchData]);

  const advanceStage = async (dealId: string, currentStage: string) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    if (currentIndex >= STAGE_ORDER.length - 1) return;

    const nextStage = STAGE_ORDER[currentIndex + 1];
    setAdvancingDeal(dealId);

    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, stage: nextStage }),
    });

    if (res.ok) {
      setDeals((prev) =>
        prev.map((d) => d.id === dealId ? { ...d, stage: nextStage } : d)
      );
      if (selectedDeal?.id === dealId) {
        setSelectedDeal((prev) => prev ? { ...prev, stage: nextStage } : prev);
      }
    }
    setAdvancingDeal(null);
  };

  const saveAmount = async () => {
    if (!selectedDeal) return;
    setSavingAmount(true);

    const res = await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: selectedDeal.id,
        amount: parseFloat(editAmount) || 0,
        notes: editNotes,
      }),
    });

    if (res.ok) {
      const updated = { ...selectedDeal, amount: parseFloat(editAmount) || 0, notes: editNotes };
      setSelectedDeal(updated);
      setDeals((prev) => prev.map((d) => d.id === selectedDeal.id ? updated : d));
      setShowEditAmount(false);
    }
    setSavingAmount(false);
  };

  const createDeal = async () => {
    if (!newDealForm.projectId || !profile) return;
    setCreatingDeal(true);

    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        investorId: profile.id,
        projectId: newDealForm.projectId,
        amount: parseFloat(newDealForm.amount) || 0,
        notes: newDealForm.notes,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      await fetchData();
      setShowNewDeal(false);
      setNewDealForm({ projectId: "", amount: "", notes: "" });
    } else {
      alert(data.error || "Failed to create deal.");
    }
    setCreatingDeal(false);
  };

  const filtered = activeStage === "all"
    ? deals
    : deals.filter((d) => d.stage === activeStage);

  const stageCount = (stage: string) => deals.filter((d) => d.stage === stage).length;
  const totalClosed = deals
    .filter((d) => d.stage === "closed")
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalPipeline = deals
    .filter((d) => d.stage !== "closed")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  // Detail view
  if (selectedDeal) {
    const stage = STAGES.find((s) => s.id === selectedDeal.stage);
    const currentIndex = STAGE_ORDER.indexOf(selectedDeal.stage);
    const nextStage = STAGES[currentIndex + 1];
    const isClosed = selectedDeal.stage === "closed";
    const commission = selectedDeal.amount
      ? (selectedDeal.amount * selectedDeal.commission_rate) / 100
      : 0;
    const isInvestor = selectedDeal.investor_id === profile?.id;

    return (
      <DashboardShell
        role={profile?.role}
        fullName={profile?.full_name}
        username={profile?.username}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          <button
            onClick={() => setSelectedDeal(null)}
            className="flex items-center gap-2 text-[#A8A6B8] text-sm hover:text-[#F5F3ED] transition w-fit"
          >
            ← Back to pipeline
          </button>

          {/* Deal header card */}
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl overflow-hidden">
            {selectedDeal.projects?.banner_url && (
              <div className="relative h-24 overflow-hidden">
                <Image
                  src={selectedDeal.projects.banner_url}
                  fill
                  alt={`${selectedDeal.projects.name} banner`}
                  className="object-cover opacity-60"
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                {selectedDeal.projects?.logo_url ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                    <Image
                      src={selectedDeal.projects.logo_url}
                      fill
                      alt={`${selectedDeal.projects.name} logo`}
                      className="object-cover rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#C9A84C20] flex items-center justify-center">
                    <span className="text-base font-medium text-[#C9A84C]">
                      {selectedDeal.projects?.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-[#F5F3ED] text-base font-medium">
                    {selectedDeal.projects?.name || selectedDeal.title}
                  </h2>
                  <p className="text-[#5C5A70] text-xs mt-0.5">
                    {selectedDeal.projects?.sector} · {selectedDeal.projects?.category?.toUpperCase()}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${stage?.bg} ${stage?.color} ${stage?.border}`}>
                  {stage?.label}
                </span>
              </div>

              {/* Counterparty */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#0F0F1A] rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0">
                  {selectedDeal.profiles?.full_name?.[0] || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[#F5F3ED] text-xs font-medium">
                      {selectedDeal.profiles?.full_name}
                    </span>
                    {selectedDeal.profiles?.is_verified && (
                      <CheckCircle size={11} className="text-emerald-400" />
                    )}
                  </div>
                  <span className="text-[#5C5A70] text-xs">
                    {isInvestor ? "Founder" : "Investor"} · @{selectedDeal.profiles?.username}
                    {selectedDeal.profiles?.country ? ` · ${selectedDeal.profiles.country}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => router.push("/dashboard/chats")}
                  className="flex items-center gap-1.5 text-xs text-[#C9A84C] border border-[#C9A84C30] px-2.5 py-1.5 rounded-lg hover:bg-[#C9A84C10] transition"
                >
                  <MessageCircle size={12} />
                  Chat
                </button>
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#0F0F1A] rounded-xl p-3 text-center">
                  <div className="text-[#C9A84C] text-base font-medium">
                    {formatCurrency(selectedDeal.amount)}
                  </div>
                  <div className="text-[#5C5A70] text-xs mt-0.5">Deal size</div>
                </div>
                <div className="bg-[#0F0F1A] rounded-xl p-3 text-center">
                  <div className="text-[#F5F3ED] text-base font-medium">
                    {selectedDeal.commission_rate}%
                  </div>
                  <div className="text-[#5C5A70] text-xs mt-0.5">REACH fee</div>
                </div>
                <div className="bg-[#0F0F1A] rounded-xl p-3 text-center">
                  <div className={`text-base font-medium ${isClosed ? "text-emerald-400" : "text-[#5C5A70]"}`}>
                    {isClosed ? formatCurrency(commission) : "Pending"}
                  </div>
                  <div className="text-[#5C5A70] text-xs mt-0.5">Commission</div>
                </div>
              </div>

              {/* Edit amount */}
              {!isClosed && (
                <button
                  onClick={() => {
                    setEditAmount(selectedDeal.amount?.toString() || "");
                    setEditNotes(selectedDeal.notes || "");
                    setShowEditAmount(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[#3A3A52] text-[#5C5A70] text-xs py-2.5 rounded-lg hover:border-[#C9A84C] hover:text-[#C9A84C] transition mb-4"
                >
                  <DollarSign size={13} />
                  {selectedDeal.amount ? "Update deal size" : "Set deal size"}
                </button>
              )}

              {showEditAmount && (
                <div className="bg-[#0F0F1A] border border-[#3A3A52] rounded-xl p-4 mb-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[#A8A6B8] text-xs mb-1.5 block">Deal size (USD)</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="e.g. 250000"
                        className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[#A8A6B8] text-xs mb-1.5 block">Deal notes</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Key terms, conditions, notes…"
                        className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition resize-none placeholder-[#5C5A70]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveAmount}
                        disabled={savingAmount}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition"
                      >
                        {savingAmount ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Save
                      </button>
                      <button
                        onClick={() => setShowEditAmount(false)}
                        className="flex-1 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDeal.notes && (
                <div className="bg-[#0F0F1A] rounded-lg px-4 py-3 mb-4">
                  <div className="text-[#5C5A70] text-xs mb-1">Deal notes</div>
                  <p className="text-[#A8A6B8] text-sm">{selectedDeal.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stage timeline */}
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5">
            <h3 className="text-[#F5F3ED] text-sm font-medium mb-4">Deal progress</h3>
            <div className="flex flex-col gap-0">
              {STAGES.map((s, i) => {
                const StageIcon = s.icon;
                const isDone = STAGE_ORDER.indexOf(selectedDeal.stage) > i;
                const isCurrent = selectedDeal.stage === s.id;

                return (
                  <div key={s.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition ${
                        isDone
                          ? "bg-emerald-900/30 border-emerald-600"
                          : isCurrent
                          ? `${s.bg} ${s.border}`
                          : "bg-[#0F0F1A] border-[#3A3A52]"
                      }`}>
                        {isDone ? (
                          <CheckCircle size={14} className="text-emerald-400" />
                        ) : (
                          <StageIcon size={14} className={isCurrent ? s.color : "text-[#3A3A52]"} />
                        )}
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={`w-0.5 h-10 mt-1 ${isDone ? "bg-emerald-600" : "bg-[#3A3A52]"}`} />
                      )}
                    </div>

                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-sm font-medium ${
                            isDone ? "text-emerald-400"
                            : isCurrent ? s.color
                            : "text-[#5C5A70]"
                          }`}>
                            {s.label}
                            {isDone && <span className="ml-2 text-xs font-normal text-emerald-600">✓ Complete</span>}
                            {isCurrent && <span className="ml-2 text-xs font-normal">← Current stage</span>}
                          </div>
                          <p className="text-[#5C5A70] text-xs mt-0.5 leading-relaxed max-w-xs">
                            {s.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage info box */}
          {stage && (
            <div className={`${stage.bg} border ${stage.border} rounded-xl p-4`}>
              <div className="flex items-start gap-2">
                <Info size={14} className={`${stage.color} shrink-0 mt-0.5`} />
                <div>
                  <div className={`text-sm font-medium ${stage.color} mb-1`}>
                    Current stage: {stage.label}
                  </div>
                  <p className="text-[#A8A6B8] text-xs leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {!isClosed && nextStage && (
              <button
                onClick={() => advanceStage(selectedDeal.id, selectedDeal.stage)}
                disabled={advancingDeal === selectedDeal.id}
                className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-xl hover:opacity-90 transition"
              >
                {advancingDeal === selectedDeal.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <ArrowRight size={15} />
                    Advance to {nextStage.label}
                  </>
                )}
              </button>
            )}

            {isClosed && (
              <div className="w-full flex items-center justify-center gap-2 bg-emerald-900/30 border border-emerald-800 text-emerald-400 font-medium text-sm py-3 rounded-xl">
                <Trophy size={15} />
                Deal successfully closed
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/dashboard/chats")}
                className="flex items-center justify-center gap-2 border border-[#3A3A52] text-[#A8A6B8] text-sm py-2.5 rounded-xl hover:border-[#5C5A70] transition"
              >
                <MessageCircle size={14} />
                Open chat
              </button>
              <button
                onClick={() => router.push(`/dashboard/project/${selectedDeal.projects?.id}`)}
                className="flex items-center justify-center gap-2 border border-[#3A3A52] text-[#A8A6B8] text-sm py-2.5 rounded-xl hover:border-[#5C5A70] transition"
              >
                <TrendingUp size={14} />
                View project
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5C5A70]">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                Started {timeAgo(selectedDeal.created_at)}
              </div>
              {selectedDeal.closed_at && (
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald-400" />
                  Closed {timeAgo(selectedDeal.closed_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={profile?.role}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      {!features.canAccessDeals && tier === "free" ? (
        <div className="max-w-3xl mx-auto">
          <TierGate
            requiredTier="pro"
            currentTier={tier}
            featureName="Deal Pipeline"
            featureDesc="Track investment deals from NDA to close. Manage term sheets, agreements, and commission tracking. Upgrade to Pro to access your deal pipeline."
          >
            <div />
          </TierGate>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#F5F3ED] text-lg font-medium">Deal pipeline</h1>
              <p className="text-[#5C5A70] text-xs mt-0.5">
                Track and manage your investment deals
              </p>
            </div>
            {profile?.role === "investor" && (
              <button
                onClick={() => setShowNewDeal(true)}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition"
              >
                <Plus size={15} />
                New deal
              </button>
            )}
          </div>

          {/* Summary cards */}
          {deals.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-[#C9A84C]" />
                  <span className="text-[#5C5A70] text-xs">Total deals</span>
                </div>
                <div className="text-[#F5F3ED] text-xl font-medium">{deals.length}</div>
              </div>
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-blue-400" />
                  <span className="text-[#5C5A70] text-xs">Pipeline value</span>
                </div>
                <div className="text-[#F5F3ED] text-xl font-medium">{formatCurrency(totalPipeline)}</div>
              </div>
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={14} className="text-emerald-400" />
                  <span className="text-[#5C5A70] text-xs">Closed</span>
                </div>
                <div className="text-[#F5F3ED] text-xl font-medium">{formatCurrency(totalClosed)}</div>
              </div>
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-[#C9A84C]" />
                  <span className="text-[#5C5A70] text-xs">REACH fees due</span>
                </div>
                <div className="text-[#F5F3ED] text-xl font-medium">
                  {formatCurrency(
                    deals
                      .filter((d) => d.stage === "closed")
                      .reduce((sum, d) => sum + ((d.amount * d.commission_rate) / 100), 0)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stage filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveStage("all")}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                activeStage === "all"
                  ? "bg-[#C9A84C] text-[#1A1A2E] border-[#C9A84C] font-medium"
                  : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
              }`}
            >
              All ({deals.length})
            </button>
            {STAGES.map((s) => {
              const count = stageCount(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                    activeStage === s.id
                      ? `${s.bg} ${s.color} ${s.border} font-medium`
                      : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.shortLabel} ({count})
                </button>
              );
            })}
          </div>

          {/* Deals list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-[#3A3A52] rounded-xl">
              <div className="w-14 h-14 rounded-full bg-[#1A1A2E] flex items-center justify-center">
                <Handshake size={24} className="text-[#3A3A52]" />
              </div>
              <div className="text-center">
                <p className="text-[#F5F3ED] text-sm font-medium mb-1">No deals yet</p>
                <p className="text-[#5C5A70] text-xs max-w-xs leading-relaxed">
                  Initiate deals directly from project pages or from chats using the NDA button.
                  Deals track your investment discussions from NDA to close.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/dashboard/investor")}
                  className="flex items-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs px-3 py-2 rounded-lg hover:border-[#5C5A70] transition"
                >
                  Browse projects
                </button>
                {profile?.role === "investor" && (
                  <button
                    onClick={() => setShowNewDeal(true)}
                    className="flex items-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 transition"
                  >
                    <Plus size={13} />
                    New deal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((deal) => {
                const stage = STAGES.find((s) => s.id === deal.stage);
                const isClosed = deal.stage === "closed";
                const isInvestor = deal.investor_id === profile?.id;
                const currentIndex = STAGE_ORDER.indexOf(deal.stage);
                const commission = deal.amount
                  ? (deal.amount * deal.commission_rate) / 100
                  : 0;

                return (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 hover:border-[#5C5A70] transition cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      {deal.projects?.logo_url ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                          <Image
                            src={deal.projects.logo_url}
                            fill
                            alt={`${deal.projects.name} logo`}
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#C9A84C20] flex items-center justify-center">
                          <span className="text-sm font-medium text-[#C9A84C]">
                            {deal.projects?.name?.[0] || "?"}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[#F5F3ED] text-sm font-medium truncate">
                              {deal.projects?.name || deal.title}
                            </div>
                            <div className="text-[#5C5A70] text-xs mt-0.5">
                              {isInvestor ? "You → Founder" : "Investor → You"} · {timeAgo(deal.created_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${stage?.bg} ${stage?.color} ${stage?.border}`}>
                              {stage?.label}
                            </span>
                            <ChevronRight size={15} className="text-[#3A3A52] group-hover:text-[#A8A6B8] transition" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      {STAGE_ORDER.map((s, i) => (
                        <div
                          key={s}
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            i <= currentIndex
                              ? isClosed ? "bg-emerald-500" : "bg-[#C9A84C]"
                              : "bg-[#2A2A3E]"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {deal.amount > 0 && (
                          <div>
                            <div className="text-[#F5F3ED] text-sm font-medium">
                              {formatCurrency(deal.amount)}
                            </div>
                            <div className="text-[#5C5A70] text-xs">Deal size</div>
                          </div>
                        )}
                        {isClosed && commission > 0 && (
                          <div>
                            <div className="text-[#C9A84C] text-sm font-medium">
                              {formatCurrency(commission)}
                            </div>
                            <div className="text-[#5C5A70] text-xs">Fee due</div>
                          </div>
                        )}
                        {deal.projects?.sector && (
                          <div className="hidden md:block">
                            <div className="text-[#A8A6B8] text-xs">{deal.projects.sector}</div>
                            <div className="text-[#5C5A70] text-xs">{deal.projects?.category?.toUpperCase()}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!isClosed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              advanceStage(deal.id, deal.stage);
                            }}
                            disabled={advancingDeal === deal.id}
                            className="flex items-center gap-1 text-xs text-[#C9A84C] border border-[#C9A84C30] px-2.5 py-1.5 rounded-lg hover:bg-[#C9A84C10] transition"
                          >
                            {advancingDeal === deal.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <>
                                Next stage
                                <ArrowRight size={11} />
                              </>
                            )}
                          </button>
                        )}
                        {isClosed && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <Trophy size={12} />
                            Closed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New deal modal */}
      {showNewDeal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#F5F3ED] text-base font-medium">Initiate new deal</h3>
              <button onClick={() => setShowNewDeal(false)}>
                <X size={18} className="text-[#5C5A70]" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Select project *</label>
                <select
                  value={newDealForm.projectId}
                  onChange={(e) => setNewDealForm({ ...newDealForm, projectId: e.target.value })}
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition"
                >
                  <option value="">Choose a project…</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Initial deal size (USD)</label>
                <input
                  type="number"
                  value={newDealForm.amount}
                  onChange={(e) => setNewDealForm({ ...newDealForm, amount: e.target.value })}
                  placeholder="e.g. 250000 (can update later)"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                />
              </div>

              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Notes (optional)</label>
                <textarea
                  value={newDealForm.notes}
                  onChange={(e) => setNewDealForm({ ...newDealForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Initial terms, conditions…"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none"
                />
              </div>

              <div className="bg-[#C9A84C10] border border-[#C9A84C30] rounded-lg px-3 py-2 text-xs text-[#C9A84C]">
                A 3% commission applies on the final deal size when closed through REACH.
              </div>

              <button
                onClick={createDeal}
                disabled={!newDealForm.projectId || creatingDeal}
                className={`w-full font-medium text-sm py-3 rounded-lg transition ${
                  newDealForm.projectId && !creatingDeal
                    ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                    : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                }`}
              >
                {creatingDeal ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Creating…
                  </span>
                ) : "Initiate deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}