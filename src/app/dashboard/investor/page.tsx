"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import {
  Search,
  SlidersHorizontal,
  Star,
  CheckCircle,
  TrendingUp,
  MessageCircle,
  Bookmark,
  Loader2,
  ChevronDown,
  MapPin,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyProvider";
import TierBadge from "@/components/TierBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import MatchScoreBadge from "@/components/MatchScoreBadge";

type Project = {
  id: string;
  name: string;
  short_description: string;
  category: string;
  sector: string;
  funding_goal: number;
  equity_offered: number;
  amount_raised: number;
  country: string;
  tier: string;
  image_url?: string | null; // Added field to support rich project layout images
  banner_url?: string | null; // Added alternative mapping fallback
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    trust_score: number;
    subscription_tier?: string;
    is_scam?: boolean;
    is_banned?: boolean;
  };
};

const FILTERS = ["All", "Web2", "Web3", "Africa", "Asia", "FinTech", "HealthTech", "DeFi"];

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

function getRaisedPercent(goal: number, raised: number) {
  if (!goal) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}

const AVATAR_COLORS = [
  "bg-emerald-900 text-emerald-300",
  "bg-blue-900 text-blue-300",
  "bg-purple-900 text-purple-300",
  "bg-orange-900 text-orange-300",
  "bg-indigo-900 text-indigo-300",
  "bg-rose-900 text-rose-300",
];

function getColor(id: string) {
  return AVATAR_COLORS[id?.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function InvestorDashboard() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(userProf);
      }
    }
    void loadProfile();
  }, [supabase]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/projects");
    const { projects } = await res.json();
    setProjects(projects || []);
    setLoading(false);
  }, []);

  const fetchBookmarks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("bookmarks")
      .select("project_id")
      .eq("user_id", user.id);
    if (data) setBookmarks(data.map((b) => b.project_id));
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await fetchProjects();
      await fetchBookmarks();
    })();
  }, [fetchProjects, fetchBookmarks]);

  const toggleBookmark = async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isBookmarked = bookmarks.includes(projectId);
    if (isBookmarked) {
      await supabase.from("bookmarks").delete()
        .eq("user_id", user.id).eq("project_id", projectId);
      setBookmarks((prev) => prev.filter((id) => id !== projectId));
    } else {
      await supabase.from("bookmarks").insert({ user_id: user.id, project_id: projectId });
      setBookmarks((prev) => [...prev, projectId]);
    }
  };

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sector?.toLowerCase().includes(search.toLowerCase()) ||
      p.country?.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "All" ||
      p.category?.toLowerCase() === activeFilter.toLowerCase() ||
      p.sector === activeFilter ||
      p.country?.includes(activeFilter);
    return matchSearch && matchFilter;
  });

  const premium = filtered.filter((p) => p.tier === "premium");
  const pro = filtered.filter((p) => p.tier === "pro");
  const standard = filtered.filter((p) => p.tier !== "premium" && p.tier !== "pro");

  return (
    <DashboardShell role="investor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 text-[#F5F3ED]">

        {/* Global Toolbar Panel */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#1A1A2E]/30 border border-[#3A3A52]/60 p-4 rounded-xl backdrop-blur-md">
          {/* Search container */}
          <div className="flex-1 max-w-lg flex items-center gap-3 bg-[#0F0F1A] border border-[#3A3A52]/80 focus-within:border-[#C9A84C] focus-within:ring-1 focus-within:ring-[#C9A84C]/20 rounded-lg px-3.5 py-2.5 transition duration-200">
            <Search size={15} className="text-[#5C5A70] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search startups, sectors, founders…"
              className="flex-1 bg-transparent text-xs outline-none placeholder-[#5C5A70] text-[#F5F3ED]"
            />
          </div>

          {/* Quick Toolbar Inline Right Side Controls */}
          <div className="flex items-center gap-3 justify-between md:justify-end">
            {/* Native Clean Cross-Browser Scroll Bar Utility Container */}
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-none] [&::-webkit-scrollbar]:hidden max-w-60 sm:max-w-md md:max-w-xs lg:max-w-md py-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`shrink-0 text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-md border font-semibold transition-all ${
                    activeFilter === f
                      ? "bg-[#C9A84C] text-[#1A1A2E] border-[#C9A84C] shadow-md shadow-[#C9A84C]/10"
                      : "border-[#3A3A52]/60 text-[#A8A6B8] hover:border-[#5C5A70] hover:text-[#F5F3ED] bg-[#1A1A2E]/40"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 bg-[#1A1A2E]/60 border border-[#3A3A52]/80 text-[#A8A6B8] text-xs px-3.5 py-2 rounded-lg hover:border-[#5C5A70] hover:text-[#F5F3ED] transition duration-150 shrink-0">
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline text-[11px] uppercase tracking-wider font-semibold">Filters</span>
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Dynamic Project Rendering Context */}
        <div className="space-y-10 pb-16 md:pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-3 bg-[#1A1A2E]/10 rounded-2xl border border-[#3A3A52]/40">
              <Loader2 size={26} className="text-[#C9A84C] animate-spin" />
              <p className="text-[#5C5A70] text-xs tracking-wide">Assembling active projects…</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-[#1A1A2E]/20 rounded-2xl border border-dashed border-[#3A3A52] px-4 text-center">
              <p className="text-[#F5F3ED] text-base font-medium">No projects listed yet</p>
              <p className="text-[#5C5A70] text-xs max-w-xs">
                Be the first to list an operation ecosystem here or revisit this dashboard later.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Premium Category Layout */}
              {premium.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pl-1">
                    <div className="w-6 h-6 rounded-lg bg-[#C9A84C20] flex items-center justify-center">
                      <Star size={14} className="text-[#C9A84C] fill-[#C9A84C]" />
                    </div>
                    <h2 className="text-sm font-bold text-[#F5F3ED] uppercase tracking-wider">
                      Premium Listings
                    </h2>
                    <span className="text-xs bg-[#C9A84C20] text-[#C9A84C] px-2.5 py-0.5 rounded-full border border-[#C9A84C40] font-bold">
                      {premium.length} featured
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {premium.map((p) => (
                      <ProjectCard key={p.id} project={p} profile={profile} bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark} getColor={getColor}
                        formatCurrency={formatCurrency} getRaisedPercent={getRaisedPercent}
                        getInitials={getInitials} router={router} />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Pro Category Layout */}
              {pro.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pl-1">
                    <div className="w-6 h-6 rounded-lg bg-blue-900/30 flex items-center justify-center">
                      <Zap size={14} className="text-blue-400 fill-blue-400" />
                    </div>
                    <h2 className="text-sm font-bold text-[#F5F3ED] uppercase tracking-wider">
                      Pro Listings
                    </h2>
                    <span className="text-xs bg-blue-900/30 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-800 font-bold">
                      {pro.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {pro.map((p) => (
                      <ProjectCard key={p.id} project={p} profile={profile} bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark} getColor={getColor}
                        formatCurrency={formatCurrency} getRaisedPercent={getRaisedPercent}
                        getInitials={getInitials} router={router} />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Standard / All Registered Listings */}
              {standard.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pl-1">
                    <span className="text-sm font-bold text-[#A8A6B8] uppercase tracking-wider">
                      All Registered Listings
                    </span>
                    <span className="text-xs bg-[#1A1A2E] text-[#A8A6B8] px-2.5 py-0.5 rounded-full border border-[#3A3A52] font-semibold">
                      {standard.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                    {standard.map((p) => (
                      <ProjectCard key={p.id} project={p} profile={profile} bookmarks={bookmarks}
                        toggleBookmark={toggleBookmark} getColor={getColor}
                        formatCurrency={formatCurrency} getRaisedPercent={getRaisedPercent}
                        getInitials={getInitials} router={router} />
                    ))}
                  </div>
                </div>
              )}

              {/* Zero Filter Result fallback screen */}
              {filtered.length === 0 && (
                <div className="text-center py-24 bg-[#1A1A2E]/10 rounded-2xl border border-[#3A3A52]/30">
                  <p className="text-[#5C5A70] text-sm">No items match your modified search params.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function ProjectCard({
  project: p, profile, bookmarks, toggleBookmark, getColor,
  formatCurrency, getRaisedPercent, getInitials, router,
}: {
  project: Project;
  profile?: any;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  getColor: (id: string) => string;
  formatCurrency: (n: number) => string;
  getRaisedPercent: (goal: number, raised: number) => number;
  getInitials: (name: string) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const isBookmarked = bookmarks.includes(p.id);
  const raisedPct = getRaisedPercent(p.funding_goal, p.amount_raised);
  const projectCoverImage = p.image_url || p.banner_url;  return (
    <div className={`rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 group shadow-lg shadow-black/20 ${
      p.profiles?.is_scam 
        ? 'bg-red-950/25 border-2 border-red-500/70 shadow-red-500/15' 
        : 'bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#5C5A70]'
    }`}>
      
      <div>
        {/* Dynamic Project Visual Header Layer */}
        <div className="h-16 sm:h-32 w-full relative overflow-hidden bg-[#0F0F1A] border-b border-[#3A3A52]/30">
          {projectCoverImage ? (
            <Image
              src={projectCoverImage}
              alt={`${p.name} ecosystem preview`}
              fill
              unoptimized
              className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-[#1A1A2E] via-[#231E3D] to-[#0F0F1A]" />
          )}
          {/* Linear Backdrop protection block */}
          <div className="absolute inset-0 bg-linear-to-t from-[#1A1A2E] via-[#1A1A2E]/40 to-transparent" />
          
          {/* Tier Highlight Ribbon / Tag on Image */}
          {p.tier === "premium" && (
            <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3 z-10 flex items-center gap-1 bg-[#0F0F1A]/90 border border-[#C9A84C] text-[#C9A84C] text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-lg shadow-black/50 backdrop-blur-xs">
              <Star size={9} className="fill-[#C9A84C] sm:w-2.5 sm:h-2.5" />
              <span>PREMIUM</span>
            </div>
          )}
          {p.tier === "pro" && (
            <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3 z-10 flex items-center gap-1 bg-[#0F0F1A]/90 border border-blue-500/80 text-blue-400 text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-lg shadow-black/50 backdrop-blur-xs">
              <Zap size={9} className="fill-blue-400 sm:w-2.5 sm:h-2.5" />
              <span>PRO</span>
            </div>
          )}

          {/* Floating Bookmark Trigger */}
          <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(p.id);
              }}
              className="p-1 sm:p-1.5 rounded-md bg-[#0F0F1A]/80 border border-[#3A3A52]/60 hover:border-[#C9A84C] text-[#A8A6B8] hover:text-[#C9A84C] backdrop-blur-xs transition"
            >
              <Bookmark size={12} className={`sm:w-3.5 sm:h-3.5 ${isBookmarked ? "text-[#C9A84C] fill-[#C9A84C]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Container Body */}
        <div className="px-2.5 sm:px-5 pt-2.5 sm:pt-4 pb-1.5 sm:pb-2 space-y-2 sm:space-y-4">
          
          {/* Card Header metadata layer */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-bold px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-sm ${
                p.category?.toLowerCase() === "web3" ? "bg-purple-950/80 text-purple-300 border border-purple-800/30" : "bg-blue-950/80 text-blue-300 border border-blue-800/30"
              }`}>
                {p.category?.toUpperCase() || "WEB3"}
              </span>
              <span className="text-[8px] sm:text-[10px] text-[#A8A6B8] bg-[#0F0F1A]/50 px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded border border-[#3A3A52]/30 font-medium truncate max-w-[80px] sm:max-w-none">{p.sector}</span>
            </div>
            
            <MatchScoreBadge profile={profile} target={p} />
          </div>

          {/* Profile Card Center Content Layer */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold tracking-wider shrink-0 border border-white/5 shadow-md overflow-hidden ${getColor(p.profiles?.id || "a")}`}>
              {p.profiles?.avatar_url ? (
                <Image
                  src={p.profiles.avatar_url}
                  alt={p.profiles.full_name || p.name}
                  width={40}
                  height={40}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(p.profiles?.full_name || "?")
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[#F5F3ED] text-xs sm:text-base font-semibold truncate group-hover:text-[#C9A84C] transition duration-150">
                {p.name}
              </div>
              <div className="flex items-center gap-1 min-w-0 mt-0.5 flex-wrap">
                <span className="text-[#5C5A70] text-[10px] sm:text-xs truncate font-medium">
                  by {p.profiles?.full_name || "Anonymous Founder"}
                </span>
                <VerifiedBadge 
                  tier={p.tier || p.profiles?.subscription_tier} 
                  isVerified={p.profiles?.is_verified} 
                  isScam={p.profiles?.is_scam}
                  isBanned={p.profiles?.is_banned}
                  size={12} 
                />
              </div>
            </div>
          </div>

          {/* Context description block */}
          <p className="text-[#A8A6B8] text-[10px] sm:text-xs leading-relaxed line-clamp-2 min-h-5 sm:min-h-8">
            {p.short_description}
          </p>
        </div>
      </div>

      {/* Metrics Section Footer Block */}
      <div className="px-2.5 sm:px-5 pb-2.5 sm:pb-5 pt-1.5 sm:pt-3 border-t border-[#3A3A52]/30 bg-[#141426]/60 space-y-2 sm:space-y-3.5">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 text-left">
          <div className="bg-[#0F0F1A]/50 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
            <div className="text-[#F5F3ED] text-[9px] sm:text-xs font-bold truncate">{formatCurrency(p.funding_goal)}</div>
            <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Goal</div>
          </div>
          <div className="bg-[#0F0F1A]/50 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
            <div className="text-[#F5F3ED] text-[9px] sm:text-xs font-bold truncate">{p.equity_offered}%</div>
            <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Equity</div>
          </div>
          <div className="bg-[#0F0F1A]/50 rounded-md sm:rounded-lg p-1 sm:p-2 border border-[#3A3A52]/20">
            <div className="text-[#C9A84C] text-[9px] sm:text-xs font-bold truncate">{raisedPct}%</div>
            <div className="text-[#5C5A70] text-[8px] sm:text-[9px] uppercase tracking-wider font-bold mt-0.5 truncate">Raised</div>
          </div>
        </div>

        {/* Progress Tracker Layer */}
        <div className="h-1 bg-[#0F0F1A] rounded-full overflow-hidden">
          <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${raisedPct}%` }} />
        </div>

        {/* Operational Trigger Elements */}
        <div className="flex gap-1.5 sm:gap-2.5 pt-0.5">
          <button
            onClick={async () => {
              const supabaseClient = createClient();
              const { data: { user } } = await supabaseClient.auth.getUser();
              if (!user) return;
              const res = await fetch("/api/conversations/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  otherUserId: p.profiles?.id,
                  projectId: p.id,
                }),
              });
              const { conversationId } = await res.json();
              router.push(`/dashboard/chats?conversationId=${conversationId}`);
            }}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider py-1.5 sm:py-2.5 rounded-md sm:rounded-lg hover:bg-[#b5953e] transition duration-150 shadow-md shadow-[#C9A84C]/5"
          >
            <MessageCircle size={11} className="sm:w-3.5 sm:h-3.5" />
            <span>Chat</span>
          </button>
          
          <button
            onClick={() => router.push(`/dashboard/project/${p.id}`)}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 bg-[#0F0F1A]/40 border border-[#3A3A52] text-[#A8A6B8] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider py-1.5 sm:py-2.5 rounded-md sm:rounded-lg hover:border-[#5C5A70] hover:text-[#F5F3ED] transition duration-150"
          >
            <TrendingUp size={11} className="sm:w-3.5 sm:h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>

    </div>
  );
}