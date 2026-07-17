"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Sparkles, MessageCircle, Bookmark,
  CheckCircle, Loader2, TrendingUp,
  Star, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  name: string;
  short_description: string;
  category: string;
  sector: string;
  funding_goal: number;
  equity_offered: number;
  amount_raised: number;
  tier: string;
  logo_url: string | null;
  match_score: number;
  match_reasons: string[];
  profiles: {
    id: string;
    full_name: string;
    is_verified: boolean;
    trust_score: number;
  } | null;
};

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

function getRaisedPercent(goal: number, raised: number) {
  if (!goal) return 0;
  return Math.min(Math.round((raised / goal) * 100), 100);
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-[#C9A84C]";
  return "text-blue-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-900/30 border-emerald-800";
  if (score >= 60) return "bg-[#C9A84C10] border-[#C9A84C30]";
  return "bg-blue-900/30 border-blue-800";
}

export default function MatchesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chattingId, setChattingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    username?: string;
    role?: string;
    subscription_tier?: string | null;
  } | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, bmarkRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, role, subscription_tier")
          .eq("id", user.id)
          .single(),
        supabase
          .from("bookmarks")
          .select("project_id")
          .eq("user_id", user.id),
      ]);

      if (profRes.data) setProfile(profRes.data);
      setBookmarks(bmarkRes.data?.map((b) => b.project_id) || []);

      const url = `/api/ai/matches?investorId=${user.id}&limit=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error("Matches API error:", data);
        setError(data.error || "Failed to load matches");
        setMatches([]);
        return;
      }

      setMatches(data.matches || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [supabase]);

   useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

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

  const startChat = async (founderId: string, projectId: string) => {
    if (!founderId) return;
    setChattingId(projectId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setChattingId(null); return; }

    try {
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, otherUserId: founderId, projectId }),
      });
      const { conversationId } = await res.json();
      router.push(`/dashboard/chats?conversationId=${conversationId}`);
    } catch (err) {
      console.error("Chat start failed", err);
    } finally {
      setChattingId(null);
    }
  };

  return (
    <DashboardShell
      role="investor"
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-[#C9A84C]" />
              <h1 className="text-[#F5F3ED] text-lg font-medium">AI Match Engine</h1>
            </div>
            <p className="text-[#5C5A70] text-xs">
              Scored recommendations based on your investment profile
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border border-[#3A3A52] text-[#A8A6B8] text-sm px-3 py-2 rounded-lg hover:border-[#5C5A70] transition"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Profile nudge */}
        {profile && !profile.subscription_tier && (
          <div className="bg-[#C9A84C10] border border-[#C9A84C30] rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[#C9A84C] text-xs font-medium">Improve your matches</p>
              <p className="text-[#A8A6B8] text-xs mt-0.5">
                Complete your investment profile to get better recommendations
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-[#C9A84C] text-xs font-medium hover:underline shrink-0 ml-4"
            >
              Update profile
            </button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Matches */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Sparkles size={24} className="text-[#C9A84C] animate-pulse" />
            <p className="text-[#5C5A70] text-sm">Computing your matches…</p>
          </div>
        ) : matches.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <Sparkles size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">No matches yet</p>
            <p className="text-[#5C5A70] text-xs text-center max-w-xs">
              Complete your investment profile with focus areas and ticket size to get personalized matches
            </p>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-[#C9A84C] text-xs underline underline-offset-2"
            >
              Complete profile
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match, index) => {
              const raisedPct = getRaisedPercent(match.funding_goal, match.amount_raised);
              const isBookmarked = bookmarks.includes(match.id);
              const scoreColor = getScoreColor(match.match_score);
              const scoreBg = getScoreBg(match.match_score);

              return (
                <div
                  key={match.id}
                  className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 hover:border-[#5C5A70] transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {/* Rank */}
                    <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                      <span className={`text-sm font-bold ${index < 3 ? "text-[#C9A84C]" : "text-[#5C5A70] text-xs"}`}>
                        #{index + 1}
                      </span>
                    </div>

                    {/* Logo */}
                    {match.logo_url ? (
                      <img
                        src={match.logo_url}
                        alt={match.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#C9A84C20] flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-[#C9A84C]">
                          {match.name?.[0]}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[#F5F3ED] text-sm font-medium truncate">
                              {match.name}
                            </h3>
                            {match.tier === "premium" && (
                              <Star size={11} className="text-[#C9A84C] shrink-0" fill="#C9A84C" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {match.profiles?.is_verified && (
                              <CheckCircle size={10} className="text-emerald-400" />
                            )}
                            <span className="text-[#5C5A70] text-xs">
                              {match.profiles?.full_name}
                            </span>
                          </div>
                        </div>

                        {/* Match score badge */}
                        <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border shrink-0 ${scoreBg}`}>
                          <span className={`text-base font-bold ${scoreColor}`}>
                            {match.match_score}
                          </span>
                          <span className={`text-xs ${scoreColor}`}>match</span>
                        </div>
                      </div>

                      {/* Category badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          match.category === "web3"
                            ? "bg-purple-900 text-purple-300"
                            : "bg-blue-900 text-blue-300"
                        }`}>
                          {match.category?.toUpperCase()}
                        </span>
                        <span className="text-xs text-[#5C5A70]">{match.sector}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#A8A6B8] text-xs leading-relaxed mb-3 line-clamp-2">
                    {match.short_description}
                  </p>

                  {/* Match reasons */}
                  {match.match_reasons && match.match_reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {match.match_reasons.map((reason) => (
                        <span
                          key={reason}
                          className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C08] border border-[#C9A84C20] text-[#C9A84C]"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Goal</div>
                      <div className="text-[#F5F3ED] text-sm font-medium">
                        {formatCurrency(match.funding_goal)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Equity</div>
                      <div className="text-[#F5F3ED] text-sm font-medium">
                        {match.equity_offered}%
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Raised</div>
                      <div className="text-[#C9A84C] text-sm font-medium">{raisedPct}%</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full"
                      style={{ width: `${raisedPct}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startChat(match.profiles?.id || "", match.id)}
                      disabled={chattingId === match.id || !match.profiles?.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                      {chattingId === match.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <MessageCircle size={13} />
                      }
                      {chattingId === match.id ? "Starting…" : "Chat"}
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/project/${match.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
                    >
                      <TrendingUp size={13} />
                      Details
                    </button>
                    <button
                      onClick={() => toggleBookmark(match.id)}
                      className="w-9 flex items-center justify-center border border-[#3A3A52] rounded-lg hover:border-[#5C5A70] transition"
                    >
                      <Bookmark
                        size={14}
                        className={isBookmarked ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#5C5A70]"}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}