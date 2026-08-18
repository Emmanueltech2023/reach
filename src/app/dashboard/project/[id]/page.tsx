"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, MessageCircle, Bookmark, Share2, Handshake,
  CheckCircle, Globe, X, MapPin, ExternalLink, Loader2, Calendar, Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TierBadge from "@/components/TierBadge";
import { useCurrency } from "@/components/CurrencyProvider";

type Project = {
  id: string;
  name: string;
  short_description: string;
  full_description: string;
  category: string;
  sector: string;
  funding_goal: number;
  equity_offered: number;
  amount_raised: number;
  country: string;
  tier: string;
  stage: string;
  website: string | null;
  twitter: string | null;
  logo_url: string | null;
  banner_url: string | null;
  view_count: number;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    trust_score: number;
    country: string;
    subscription_tier?: "free" | "pro" | "premium";
  };
};

function formatCurrency(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function getRaisedPercent(goal: number, raised: number) {
  if (!goal) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea Stage",
  mvp: "MVP",
  growth: "Growth",
  scaling: "Scaling",
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { formatCurrency } = useCurrency();
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProjectData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        const { data: bookmark } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", params.id)
          .maybeSingle();

        setIsBookmarked(!!bookmark);
      }

      const { data } = await supabase
        .from("projects")
        .select(`*, profiles(id, full_name, username, avatar_url, is_verified, trust_score, country, subscription_tier)`)
        .eq("id", params.id)
        .single();

      if (data) {
        setProject(data);

        if (user && user.id !== data.profiles?.id) {
          await supabase.from("project_views").insert({
            project_id: data.id,
            viewer_id: user.id,
          });
          await supabase
            .from("projects")
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq("id", data.id);
        }
      }

      setLoading(false);
    };

    void loadProjectData();
  }, [params.id, supabase]);

  const toggleBookmark = async () => {
    if (!currentUserId || !project) return;

    if (isBookmarked) {
      await supabase.from("bookmarks").delete()
        .eq("user_id", currentUserId).eq("project_id", project.id);
      setIsBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({
        user_id: currentUserId, project_id: project.id,
      });
      setIsBookmarked(true);
    }
  };

  const startChat = async () => {
    if (!currentUserId || !project) return;

    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        otherUserId: project.profiles?.id,
        projectId: project.id,
      }),
    });
    const { conversationId } = await res.json();
    router.push(`/dashboard/chats?conversationId=${conversationId}`);
  };

  const shareProject = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: project?.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex flex-col items-center justify-center gap-4">
        <p className="text-[#F5F3ED] font-medium">Project workspace missing or archived</p>
        <button onClick={() => router.back()} className="text-[#C9A84C] text-sm font-semibold flex items-center gap-2 hover:underline">
          <ArrowLeft size={14} /> Return to dashboard
        </button>
      </div>
    );
  }

  const raisedPct = getRaisedPercent(project.funding_goal, project.amount_raised);
  const isCurrentUserProject = currentUserId === project.profiles?.id;

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#F5F3ED] pb-24 md:pb-12">
      
      {/* Immersive Structural Header Banner */}
      <div className="relative w-full h-56 md:h-72 bg-[#1A1A2E] border-b border-[#3A3A52]/40">
        {project.banner_url ? (
          <Image
            src={project.banner_url}
            alt={`${project.name} banner`}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-[#1A1A2E] via-[#231E3D] to-[#0F0F1A]" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#0F0F1A] via-transparent to-black/30" />
        
        {/* Upper Floating Controls Row */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 flex items-center justify-between relative z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#0F0F1A]/70 text-[#F5F3ED] rounded-full flex items-center justify-center backdrop-blur-md border border-[#3A3A52]/60 hover:bg-[#0F0F1A] transition shadow-md"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={shareProject}
              className="w-10 h-10 bg-[#0F0F1A]/70 text-[#F5F3ED] rounded-full flex items-center justify-center backdrop-blur-md border border-[#3A3A52]/60 hover:bg-[#0F0F1A] transition shadow-md"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={toggleBookmark}
              className="w-10 h-10 bg-[#0F0F1A]/70 rounded-full flex items-center justify-center backdrop-blur-md border border-[#3A3A52]/60 hover:bg-[#0F0F1A] transition shadow-md"
            >
              <Bookmark
                size={16}
                className={isBookmarked ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#A8A6B8]"}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Layer */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20">
        
        {/* Profile Identity Overlay Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-8">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-2xl border-4 border-[#0F0F1A] overflow-hidden bg-[#1A1A2E] flex items-center justify-center shadow-xl shrink-0">
              {project.logo_url ? (
                <Image src={project.logo_url} alt={`${project.name} logo`} width={96} height={96} unoptimized className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-[#C9A84C]">
                  {project.name[0]}
                </span>
              )}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F3ED]">{project.name}</h1>
                {project.tier === "premium" && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-sm bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30">
                    Premium
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-[#A8A6B8]">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                  project.category === "web3" ? "bg-purple-950/80 text-purple-300 border border-purple-800/40" : "bg-blue-950/80 text-blue-300 border border-blue-800/40"
                }`}>{project.category?.toUpperCase()}</span>
                <span className="text-[#5C5A70]">•</span>
                <span className="text-[#A8A6B8] font-medium">{project.sector}</span>
                <span className="text-[#5C5A70]">•</span>
                <span className="bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] px-2 py-0.5 rounded-sm text-[11px]">
                  {STAGE_LABELS[project.stage] || project.stage}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Responsive Grid Framework Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT SECTION: Project Core Content Narrative Story */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Summary Pitch Box */}
            <div className="bg-[#1A1A2E]/40 border border-[#3A3A52]/60 rounded-xl p-5 backdrop-blur-xs">
              <p className="text-[#F5F3ED] text-base leading-relaxed font-medium">
                {project.short_description}
              </p>
            </div>

            {/* Quick Metadata Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1A1A2E]/60 border border-[#3A3A52]/40 rounded-xl p-4 text-center">
                <Eye size={14} className="text-[#5C5A70] mx-auto mb-1.5" />
                <div className="text-[#F5F3ED] text-base font-bold">{project.view_count || 0}</div>
                <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mt-0.5">Views</div>
              </div>
              <div className="bg-[#1A1A2E]/60 border border-[#3A3A52]/40 rounded-xl p-4 text-center">
                <MapPin size={14} className="text-[#5C5A70] mx-auto mb-1.5" />
                <div className="text-[#F5F3ED] text-sm font-bold truncate">{project.country}</div>
                <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mt-0.5">Origin</div>
              </div>
              <div className="bg-[#1A1A2E]/60 border border-[#3A3A52]/40 rounded-xl p-4 text-center">
                <Calendar size={14} className="text-[#5C5A70] mx-auto mb-1.5" />
                <div className="text-[#F5F3ED] text-sm font-bold">
                  {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mt-0.5">Listed</div>
              </div>
            </div>

            {/* Main Long Description Box */}
            <div className="bg-[#1A1A2E]/20 border border-[#3A3A52]/40 rounded-xl p-6 space-y-3">
              <h3 className="text-[#F5F3ED] text-xs uppercase tracking-wider font-bold">
                Investment Proposal & Overview
              </h3>
              <p className="text-[#A8A6B8] text-sm leading-relaxed whitespace-pre-line">
                {project.full_description}
              </p>
            </div>

            {/* Founder Card Component */}
            <div className="bg-[#1A1A2E]/30 border border-[#3A3A52]/40 rounded-xl p-5">
              <h3 className="text-[#5C5A70] text-[10px] uppercase tracking-wider font-bold mb-4">Leadership Profiles</h3>
              <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-sm font-bold text-[#C9A84C] shrink-0 overflow-hidden">
                    {project.profiles?.avatar_url ? (
                      <Image src={project.profiles.avatar_url} alt="Founder Avatar" width={48} height={48} unoptimized className="w-full h-full object-cover" />
                    ) : (
                      project.profiles?.full_name?.[0] || "?"
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#F5F3ED] text-sm font-semibold">{project.profiles?.full_name}</span>
                      {project.profiles?.is_verified && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                      <TierBadge tier={(project.profiles?.subscription_tier as "free" | "pro" | "premium") || "free"} />
                    </div>
                    <div className="text-[#5C5A70] text-xs mt-0.5">
                      @{project.profiles?.username} {project.profiles?.country && `· ${project.profiles.country}`}
                    </div>
                  </div>
                </div>
                
                {project.profiles?.trust_score > 0 && (
                  <div className="bg-[#0F0F1A] border border-[#3A3A52]/60 px-4 py-2 rounded-lg text-center min-w-17.5">
                    <div className="text-[#C9A84C] text-base font-bold">{project.profiles.trust_score.toFixed(1)}</div>
                    <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider">Trust Score</div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SECTION: Sticky Investment Metrics Dashboard Container Panel */}
          <div className="space-y-6 lg:sticky lg:top-6">
            
            {/* Funding Progress Visual Dashboard Card */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-6 shadow-xl space-y-5">
              <h3 className="text-[#A8A6B8] text-xs uppercase tracking-wider font-bold border-b border-[#3A3A52]/40 pb-2">
                Fundraising Target Allocation
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mb-0.5">Target</div>
                  <div className="text-[#F5F3ED] text-base font-bold truncate">{formatCurrency(project.funding_goal)}</div>
                </div>
                <div>
                  <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mb-0.5">Equity</div>
                  <div className="text-[#F5F3ED] text-base font-bold">{project.equity_offered}%</div>
                </div>
                <div>
                  <div className="text-[#5C5A70] text-[10px] uppercase tracking-wider mb-0.5">Progress</div>
                  <div className="text-[#C9A84C] text-base font-bold">{raisedPct}%</div>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="space-y-2">
                <div className="h-2 bg-[#0F0F1A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A84C] rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(201,168,76,0.4)]"
                    style={{ width: `${raisedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#C9A84C]">{formatCurrency(project.amount_raised)} raised</span>
                  <span className="text-[#5C5A70]">of {formatCurrency(project.funding_goal)}</span>
                </div>
              </div>

              {/* Desktop Only Action Controls block */}
              <div className="hidden md:block pt-2">
                {!isCurrentUserProject ? (
                  <div className="flex gap-3">
                    <button
                      onClick={startChat}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-bold text-xs py-3 rounded-lg hover:bg-[#b5953e] transition shadow-md"
                    >
                      <MessageCircle size={14} />
                      Message Founder
                    </button>
                    <button
                      onClick={async () => {
                        if (!currentUserId || !project) return;
                        const res = await fetch("/api/deals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            investorId: currentUserId,
                            projectId: project.id,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          router.push("/dashboard/deals");
                        } else {
                          alert(data.error || "Failed to initiate deal.");
                        }
                      }}
                      className="flex items-center justify-center gap-2 border border-[#C9A84C] text-[#C9A84C] font-medium text-sm px-4 py-3 rounded-xl hover:bg-[#C9A84C10] transition"
                    >
                      <Handshake size={14} />
                      Start deal
                    </button>
                    <button
                      onClick={toggleBookmark}
                      className="flex items-center justify-center w-12 border border-[#3A3A52] rounded-xl hover:border-[#5C5A70] transition"
                    >
                      <Bookmark size={18}
                        className={isBookmarked ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#A8A6B8]"}
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push(`/dashboard/builder/edit/${project.id}`)}
                    className="w-full flex items-center justify-center gap-2 border border-[#C9A84C] text-[#C9A84C] font-bold text-xs py-3 rounded-lg hover:bg-[#C9A84C]/10 transition"
                  >
                    Edit Project Workspace
                  </button>
                )}
              </div>
            </div>

            {/* Strategic Links Module */}
            {(project.website || project.twitter) && (
              <div className="bg-[#1A1A2E]/50 border border-[#3A3A52]/60 rounded-xl p-5 space-y-3">
                <h3 className="text-[#A8A6B8] text-xs uppercase tracking-wider font-bold">Verified External Artifacts</h3>
                <div className="flex flex-col gap-2.5 pt-1">
                  {project.website && (
                    <a href={project.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-xs text-[#A8A6B8] bg-[#0F0F1A]/40 border border-[#3A3A52]/30 p-2.5 rounded-lg hover:text-[#C9A84C] hover:border-[#5C5A70] transition group">
                      <Globe size={14} className="text-[#5C5A70] group-hover:text-[#C9A84C]" />
                      <span className="truncate flex-1">{project.website}</span>
                      <ExternalLink size={12} className="text-[#5C5A70]" />
                    </a>
                  )}
                  {project.twitter && (
                    <a href={`https://twitter.com/${project.twitter.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-xs text-[#A8A6B8] bg-[#0F0F1A]/40 border border-[#3A3A52]/30 p-2.5 rounded-lg hover:text-[#C9A84C] hover:border-[#5C5A70] transition group">
                      <X size={14} className="text-[#5C5A70] group-hover:text-[#C9A84C]" />
                      <span className="truncate flex-1">{project.twitter}</span>
                      <ExternalLink size={12} className="text-[#5C5A70]" />
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MOBILE SECURE BOTTOM PRIMARY NAV SHEET (Fixed viewport bottom panel for handheld accessibility) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A2E]/90 border-t border-[#3A3A52] p-4 backdrop-blur-lg z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.4)]">
        {!isCurrentUserProject ? (
          <div className="flex gap-3 max-w-xl mx-auto">
            <button
              onClick={startChat}
              className="flex-1 flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-bold text-sm py-3 rounded-xl hover:opacity-90 active:scale-98 transition"
            >
              <MessageCircle size={16} />
              Message Founder
            </button>
            <button
              onClick={async () => {
                if (!currentUserId || !project) return;
                const res = await fetch("/api/deals", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ investorId: currentUserId, projectId: project.id }),
                });
                const data = await res.json();
                if (res.ok) {
                  router.push("/dashboard/deals");
                } else {
                  alert(data.error || "Failed to initiate deal.");
                }
              }}
              className="flex items-center justify-center gap-2 border border-[#C9A84C] text-[#C9A84C] font-medium text-sm px-4 py-3 rounded-xl hover:bg-[#C9A84C10] transition"
            >
              <Handshake size={16} />
              Start deal
            </button>
            <button
              onClick={toggleBookmark}
              className="flex items-center justify-center w-14 bg-[#0F0F1A] border border-[#3A3A52] rounded-xl active:scale-98 transition"
            >
              <Bookmark size={18}
                className={isBookmarked ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#A8A6B8]"}
              />
            </button>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => router.push(`/dashboard/builder/edit/${project.id}`)}
              className="w-full flex items-center justify-center gap-2 border border-[#C9A84C] text-[#C9A84C] font-bold text-sm py-3 rounded-xl bg-[#C9A84C]/5 transition"
            >
              Edit Project Workspace
            </button>
          </div>
        )}
      </div>

    </div>
  );
}