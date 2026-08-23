"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useSubscription } from "@/hooks/useSubscription";
import {
  LayoutGrid,
  MessageCircle,
  Plus,
  TrendingUp,
  Eye,
  Star,
  Loader2,
  ChevronRight,
  Search,
  CheckCircle,
  MapPin,
  ShieldCheck,
  Users,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyProvider";
import TierBadge from "@/components/TierBadge";
import VerifiedBadge from "@/components/VerifiedBadge";

type Project = {
  id: string;
  name: string;
  short_description: string;
  category: string;
  sector: string;
  funding_goal: number;
  equity_offered: number;
  amount_raised: number;
  tier: string;
  is_published: boolean;
  created_at: string;
  banner_url?: string;
};

type Investor = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  country: string | null;
  bio: string | null;
  investment_focus: string[] | null;
  min_ticket_size: number | null;
  max_ticket_size: number | null;
  total_invested: number | null;
  trust_score: number;
  banner_url: string | null;
  subscription_tier?: string | null;
};

const FOCUS_FILTERS = ["All", "FinTech", "HealthTech", "DeFi", "EdTech", "AI/ML", "Web3", "SaaS"];

const AVATAR_COLORS = [
  "bg-emerald-900 text-emerald-300",
  "bg-blue-900 text-blue-300",
  "bg-purple-900 text-purple-300",
  "bg-orange-900 text-orange-300",
  "bg-indigo-900 text-indigo-300",
];

function getColor(id: string) {
  if (!id) return AVATAR_COLORS[0];
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRaisedPercent(goal: number, raised: number) {
  if (!goal) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}

export default function BuilderDashboard() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const supabase = useMemo(() => createClient(), []);
  const { features, tier } = useSubscription();

  const [activeTab, setActiveTab] = useState<"investors" | "projects" | "jobs">("investors");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  const [investorSearch, setInvestorSearch] = useState("");
  const [activeFocusFilter, setActiveFocusFilter] = useState("All");

  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
  }, [supabase]);

  const fetchMyProjects = useCallback(async () => {
    setLoadingProjects(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("founder_id", user.id)
      .order("created_at", { ascending: false });

    const mapped = (data || []).map((p: Project) => ({
      ...p,
      tier: tier && tier !== "free" ? tier : p.tier || "free",
    }));

    setProjects(mapped);
    setLoadingProjects(false);
  }, [supabase, tier]);

  const fetchMyJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/jobs?postedBy=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const jobsList = data.jobs || [];

        // Also fetch application counts
        const appsRes = await fetch(`/api/jobs/applications?posterId=${user.id}`);
        const appsJson = await appsRes.json();
        const appsList = Array.isArray(appsJson) ? appsJson : (appsJson.applications || []);
        
        const appCounts: Record<string, number> = {};
        for (const app of appsList) {
          const jid = app.job_id;
          if (jid) appCounts[jid] = (appCounts[jid] || 0) + 1;
        }

        const enriched = jobsList.map((j: any) => ({
          ...j,
          applicant_count: appCounts[j.id] || 0
        }));
        setMyJobs(enriched);
      }
    } catch (e) {
      console.error("Failed to load builder jobs:", e);
    } finally {
      setLoadingJobs(false);
    }
  }, [supabase]);

  const fetchInvestors = useCallback(async () => {
    setLoadingInvestors(true);
    try {
      const res = await fetch("/api/investors");
      if (res.ok) {
        const data = await res.json();
        setInvestors(data.investors || []);
      }
    } catch (e) {
      console.error("Failed to load investors:", e);
    } finally {
      setLoadingInvestors(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchProfile();
      await fetchMyProjects();
      await fetchInvestors();
      await fetchMyJobs();
    })();
  }, [fetchProfile, fetchMyProjects, fetchInvestors, fetchMyJobs]);

  const startChat = async (investorId: string) => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          otherUserId: investorId,
        }),
      });
      const data = await res.json();
      if (data.conversationId) {
        router.push(`/dashboard/chats?conversationId=${data.conversationId}`);
      }
    } catch (e) {
      console.error("Failed to start chat with investor:", e);
    }
  };

  const filteredInvestors = useMemo(() => {
    return investors.filter((inv) => {
      const matchSearch =
        inv.full_name?.toLowerCase().includes(investorSearch.toLowerCase()) ||
        (inv.bio && inv.bio.toLowerCase().includes(investorSearch.toLowerCase())) ||
        (inv.country && inv.country.toLowerCase().includes(investorSearch.toLowerCase())) ||
        inv.investment_focus?.some((f) =>
          f.toLowerCase().includes(investorSearch.toLowerCase())
        );

      const matchFilter =
        activeFocusFilter === "All" ||
        inv.investment_focus?.some(f => f.toLowerCase() === activeFocusFilter.toLowerCase());

      return matchSearch && matchFilter;
    });
  }, [investors, investorSearch, activeFocusFilter]);

  const totalRaised = projects.reduce((sum, p) => sum + (p.amount_raised || 0), 0);
  const totalGoal = projects.reduce((sum, p) => sum + (p.funding_goal || 0), 0);

  return (
    <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
      <div className="flex flex-col gap-6 pb-28 md:pb-4">

        {/* Dashboard Header Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A3A52] pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F5F3ED]">
              Builder Dashboard
            </h1>
            <p className="text-xs text-[#5C5A70] mt-0.5">
              Discover verified investors, pitch your startups, and manage your fundraising
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#1A1A2E] p-1 rounded-xl border border-[#3A3A52] overflow-x-auto [scrollbar-none]">
            <button
              onClick={() => setActiveTab("investors")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                activeTab === "investors"
                  ? "bg-[#C9A84C] text-[#1A1A2E] shadow-md shadow-[#C9A84C]/20"
                  : "text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#2A2A3E]"
              }`}
            >
              <TrendingUp size={14} />
              Find Investors
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                activeTab === "projects"
                  ? "bg-[#C9A84C] text-[#1A1A2E] shadow-md shadow-[#C9A84C]/20"
                  : "text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#2A2A3E]"
              }`}
            >
              <LayoutGrid size={14} />
              My Projects
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                activeTab === "jobs"
                  ? "bg-[#C9A84C] text-[#1A1A2E] shadow-md shadow-[#C9A84C]/20"
                  : "text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#2A2A3E]"
              }`}
            >
              <Briefcase size={14} />
              <span>Jobs & Hiring</span>
              {myJobs.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "jobs" ? "bg-[#1A1A2E] text-[#C9A84C]" : "bg-[#C9A84C]/20 text-[#C9A84C]"
                }`}>
                  {myJobs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── TAB 1: FIND INVESTORS ── */}
        {activeTab === "investors" && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-[#1A1A2E]/50 p-4 rounded-xl border border-[#3A3A52]/60">
              <div className="flex-1 max-w-md flex items-center gap-3 bg-[#0F0F1A] border border-[#3A3A52]/80 rounded-lg px-3.5 py-2.5 focus-within:border-[#C9A84C] transition">
                <Search size={15} className="text-[#5C5A70] shrink-0" />
                <input
                  value={investorSearch}
                  onChange={(e) => setInvestorSearch(e.target.value)}
                  placeholder="Search investors by name, sector focus, country..."
                  className="flex-1 bg-transparent text-xs outline-none placeholder-[#5C5A70] text-[#F5F3ED]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-none] [&::-webkit-scrollbar]:hidden py-0.5">
                {FOCUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFocusFilter(f)}
                    className={`shrink-0 text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg border font-semibold transition ${
                      activeFocusFilter === f
                        ? "bg-[#C9A84C] text-[#1A1A2E] border-[#C9A84C] shadow-sm"
                        : "border-[#3A3A52]/60 text-[#A8A6B8] hover:border-[#5C5A70] hover:text-[#F5F3ED] bg-[#1A1A2E]/40"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Investors Grid (2 by 2 on mobile) */}
            {loadingInvestors ? (
              <div className="flex flex-col items-center justify-center py-28 gap-3">
                <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
                <p className="text-xs text-[#A8A6B8]">Loading verified investor directory...</p>
              </div>
            ) : filteredInvestors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#1A1A2E]/20 rounded-2xl border border-dashed border-[#3A3A52]/60 p-6 text-center">
                <Users size={36} className="text-[#5C5A70]" />
                <h3 className="text-sm font-semibold text-[#F5F3ED]">No investors found</h3>
                <p className="text-xs text-[#5C5A70] max-w-sm leading-relaxed">
                  No registered investor profiles match your search criteria. Try removing search filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                {filteredInvestors.map((inv) => (
                  <div
                    key={inv.id}
                    className="group bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C60] rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20"
                  >
                    <div>
                      {/* Banner */}
                      <div className="h-16 sm:h-28 overflow-hidden relative border-b border-[#3A3A52]/30 bg-[#1A1A2E]">
                        {inv.banner_url ? (
                          <Image
                            src={inv.banner_url}
                            alt="Investor banner"
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-[#1A1A2E] via-[#231E3D] to-[#0F0F1A]" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-[#1A1A2E] via-[#1A1A2E]/40 to-black/20" />
                      </div>

                      {/* Header Avatar & Pitch CTA */}
                      <div className="p-2.5 sm:p-5 -mt-5 sm:-mt-10 relative z-10">
                        <div className="flex items-end justify-between mb-2 sm:mb-3">
                          <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-[#1A1A2E] flex items-center justify-center text-xs sm:text-lg font-bold shrink-0 shadow-xl overflow-hidden bg-[#1A1A2E] ${getColor(inv.id)}`}>
                            {inv.avatar_url ? (
                              <Image
                                src={inv.avatar_url}
                                alt={inv.full_name}
                                width={64}
                                height={64}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(inv.full_name)
                            )}
                          </div>
                          
                          <button
                            onClick={() => startChat(inv.id)}
                            className="flex items-center gap-1 sm:gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-[10px] sm:text-xs font-bold px-2 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-lg hover:bg-[#b5953e] transition duration-150 shadow-md shadow-[#C9A84C]/20"
                          >
                            <MessageCircle size={12} className="sm:w-3.5 sm:h-3.5" />
                            <span>Pitch</span>
                          </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-0.5 sm:space-y-1">
                          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap">
                            <span className="text-[#F5F3ED] text-xs sm:text-base font-semibold truncate group-hover:text-[#C9A84C] transition">
                              {inv.full_name}
                            </span>
                            <VerifiedBadge 
                              tier={inv.subscription_tier} 
                              isVerified={inv.is_verified} 
                              size={13} 
                            />
                          </div>
                          
                          <div className="flex items-center flex-wrap gap-x-1.5 text-[#5C5A70] text-[10px] sm:text-[11px]">
                            <span className="font-medium truncate">@{inv.username}</span>
                            {inv.country && (
                              <>
                                <span className="text-[#3A3A52] hidden sm:inline">·</span>
                                <span className="hidden sm:flex items-center gap-0.5 text-[#A8A6B8]">
                                  <MapPin size={10} className="text-[#5C5A70]" />
                                  {inv.country}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {inv.bio && (
                          <p className="text-[#A8A6B8] text-[10px] sm:text-xs leading-relaxed mt-1.5 sm:mt-3 line-clamp-2 min-h-5 sm:min-h-8">
                            {inv.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Metrics */}
                    <div className="px-2.5 pb-2.5 pt-1.5 sm:px-5 sm:pb-5 sm:pt-3 border-t border-[#3A3A52]/30 bg-[#141426]/60">
                      <div className="grid grid-cols-3 gap-1 sm:gap-2 text-left">
                        <div className="bg-[#0F0F1A]/60 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
                          <div className="text-[#F5F3ED] text-[9px] sm:text-[11px] font-bold truncate">
                            {inv.min_ticket_size && inv.max_ticket_size 
                              ? `${formatCurrency(inv.min_ticket_size)}–${formatCurrency(inv.max_ticket_size)}`
                              : "—"
                            }
                          </div>
                          <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Ticket</div>
                        </div>

                        <div className="bg-[#0F0F1A]/60 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
                          <div className="text-[#C9A84C] text-[9px] sm:text-[11px] font-bold flex items-center gap-0.5 truncate">
                            {inv.trust_score > 0 ? (
                              <>
                                <ShieldCheck size={10} className="text-[#C9A84C] shrink-0" />
                                {inv.trust_score.toFixed(1)}
                              </>
                            ) : "—"}
                          </div>
                          <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Trust</div>
                        </div>

                        <div className="bg-[#0F0F1A]/60 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
                          <div className="text-[#F5F3ED] text-[9px] sm:text-[11px] font-bold truncate">
                            {inv.total_invested && inv.total_invested > 0 ? formatCurrency(inv.total_invested) : "—"}
                          </div>
                          <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Invested</div>
                        </div>
                      </div>

                      {inv.investment_focus && inv.investment_focus.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 sm:mt-3 h-4 sm:h-5 overflow-hidden items-center">
                          {inv.investment_focus.slice(0, 2).map((f) => (
                            <span 
                              key={f}
                              className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-sm bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] font-semibold uppercase tracking-wider truncate"
                            >
                              {f}
                            </span>
                          ))}
                          {inv.investment_focus.length > 2 && (
                            <span className="text-[9px] text-[#5C5A70] font-semibold pl-0.5">
                              +{inv.investment_focus.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MY PROJECTS ── */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 text-center">
                <div className="text-[#C9A84C] text-2xl font-medium">{projects.length}</div>
                <div className="text-[#5C5A70] text-xs mt-1">Projects</div>
              </div>
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 text-center">
                <div className="text-[#C9A84C] text-2xl font-medium">{formatCurrency(totalRaised)}</div>
                <div className="text-[#5C5A70] text-xs mt-1">Raised</div>
              </div>
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 text-center">
                <div className="text-[#C9A84C] text-2xl font-medium">{formatCurrency(totalGoal)}</div>
                <div className="text-[#5C5A70] text-xs mt-1">Goal</div>
              </div>
            </div>

            {/* Upload CTA */}
            <button
              onClick={() => {
                if (features.maxProjects !== -1 && projects.length >= features.maxProjects) {
                  router.push("/dashboard/upgrade");
                } else {
                  router.push("/dashboard/builder/upload");
                }
              }}
              className="w-full flex items-center justify-between bg-[#C9A84C] text-[#1A1A2E] rounded-xl px-4 py-3 hover:opacity-90 transition font-medium"
            >
              <div className="flex items-center gap-3">
                <Plus size={18} />
                <div className="text-left">
                  <div className="text-sm font-semibold">
                    {features.maxProjects !== -1 && projects.length >= features.maxProjects
                      ? "Upgrade to add more projects"
                      : "Upload new project"
                    }
                  </div>
                  <div className="text-xs opacity-75">
                    {features.maxProjects !== -1 && projects.length >= features.maxProjects
                      ? `Free plan: ${features.maxProjects} project limit`
                      : "Present your venture to global investors"
                    }
                  </div>
                </div>
              </div>
              <ChevronRight size={16} />
            </button>

            {/* Projects list */}
            {loadingProjects ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
                <LayoutGrid size={28} className="text-[#3A3A52]" />
                <p className="text-[#5C5A70] text-sm">No projects yet</p>
                <button
                  onClick={() => router.push("/dashboard/builder/upload")}
                  className="text-[#C9A84C] text-xs underline underline-offset-2 font-medium"
                >
                  Upload your first project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col justify-between overflow-hidden">
                    <div>
                      {/* Banner */}
                      {p.banner_url ? (
                        <div className="-mx-4 -mt-4 mb-4 aspect-21/9 bg-[#0F0F1A] border-b border-[#3A3A52] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={p.banner_url} 
                            alt={`${p.name} banner`} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="pt-1" />
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              p.category === "web3" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"
                            }`}>
                              {p.category?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#F5F3ED] text-base font-semibold">{p.name}</span>
                            <VerifiedBadge tier={p.tier} size={15} />
                          </div>
                          <div className="text-[#5C5A70] text-xs mt-0.5">
                            {p.sector} · {p.is_published ? "Published" : "Draft"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
                          <div className="text-[#F5F3ED] text-xs font-medium">{formatCurrency(p.funding_goal)}</div>
                          <div className="text-[#5C5A70] text-xs">Goal</div>
                        </div>
                        <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
                          <div className="text-[#F5F3ED] text-xs font-medium">{p.equity_offered}%</div>
                          <div className="text-[#5C5A70] text-xs">Equity</div>
                        </div>
                        <div className="bg-[#0F0F1A] rounded-lg p-2 text-center">
                          <div className="text-[#C9A84C] text-xs font-medium">
                            {getRaisedPercent(p.funding_goal, p.amount_raised)}%
                          </div>
                          <div className="text-[#5C5A70] text-xs">Raised</div>
                        </div>
                      </div>

                      <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-[#C9A84C] rounded-full"
                          style={{ width: `${getRaisedPercent(p.funding_goal, p.amount_raised)}%` }} />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => router.push(`/dashboard/project/${p.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => router.push("/dashboard/chats")}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
                      >
                        <MessageCircle size={13} /> Chats
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/builder/analytics/${p.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs py-2 rounded-lg hover:opacity-90 transition font-semibold"
                      >
                        <TrendingUp size={13} /> Analytics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: JOBS & HIRING ── */}
        {activeTab === "jobs" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1A1A2E]/50 p-4 rounded-xl border border-[#3A3A52]/60">
              <div>
                <h2 className="text-base font-bold text-[#F5F3ED] flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#C9A84C]" />
                  Active Job Openings & Hiring
                </h2>
                <p className="text-xs text-[#A8A6B8] mt-0.5">
                  Track applications, recruit candidates, and post opportunities for your startups.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => router.push("/dashboard/jobs/manage")}
                  className="px-4 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
                >
                  Manage Full Pipeline
                </button>
                <button
                  onClick={() => router.push("/dashboard/jobs/post")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] text-xs font-bold text-[#0A0A0F] transition-all shadow-md shadow-[#C9A84C]/20"
                >
                  <Plus size={14} />
                  <span>Post a Job</span>
                </button>
              </div>
            </div>

            {loadingJobs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
              </div>
            ) : myJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] py-16 px-4 text-center shadow-xl">
                <div className="mb-4 rounded-full bg-[#0A0A0F] p-4 shadow-inner">
                  <Briefcase className="h-8 w-8 text-[#5C5A70]" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-[#F5F3ED]">No active jobs posted yet</h3>
                <p className="mb-5 max-w-sm text-xs text-[#A8A6B8]">
                  Hire top Web2 & Web3 engineers, designers, and growth marketers for your startup.
                </p>
                <button
                  onClick={() => router.push("/dashboard/jobs/post")}
                  className="flex items-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-2.5 text-xs font-bold text-[#0A0A0F] hover:bg-[#D4B55D] transition-all shadow-md shadow-[#C9A84C]/20"
                >
                  <Plus size={14} />
                  <span>Post Your First Job</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="flex flex-col rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 shadow-xl transition-all hover:border-[#C9A84C]/40 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#C9A84C]/10 border border-[#C9A84C]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                          {job.category}
                        </span>
                        <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {job.job_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#5C5A70]">
                        {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#F5F3ED] line-clamp-1">{job.title}</h3>
                      <p className="text-xs text-[#A8A6B8] mt-0.5">{job.company_name}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#C9A84C]" />
                        <span className="text-xs text-[#A8A6B8]">Candidates</span>
                      </div>
                      <span className="text-xs font-extrabold text-[#F5F3ED]">
                        {job.applicant_count || 0} Applied
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#3A3A52]/60">
                      <button
                        onClick={() => router.push(`/dashboard/jobs/applicants/${job.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] text-xs font-bold py-2 transition-all shadow-sm"
                      >
                        <Users size={13} />
                        <span>View Applicants ({job.applicant_count || 0})</span>
                      </button>
                      <button
                        onClick={() => router.push("/dashboard/jobs/manage")}
                        className="p-2 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] hover:border-[#C9A84C] transition-colors"
                        title="Manage Job"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardShell>
  );
}