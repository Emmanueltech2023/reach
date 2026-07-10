"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Bookmark, MessageCircle, TrendingUp,
  Star, CheckCircle, Loader2,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type BookmarkedProject = {
  id: string;
  project_id: string;
  created_at: string;
  projects: {
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
    profiles: {
      id: string;
      full_name: string;
      is_verified: boolean;
    };
  };
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

export default function BookmarksPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [bookmarks, setBookmarks] = useState<BookmarkedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
    role: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, username, role")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    const { data } = await supabase
      .from("bookmarks")
      .select(`
        *,
        projects(
          id, name, short_description, category, sector,
          funding_goal, equity_offered, amount_raised, tier, logo_url,
          profiles(id, full_name, is_verified)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setBookmarks(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const removeBookmark = async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("project_id", projectId);

    setBookmarks((prev) =>
      prev.filter((b) => b.projects?.id !== projectId)
    );
  };

  const startChat = async (founderId: string, projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        otherUserId: founderId,
        projectId,
      }),
    });
    const { conversationId } = await res.json();
    router.push(`/dashboard/chats?conversationId=${conversationId}`);
  };

  return (
    <DashboardShell
      role={profile?.role as "investor" | "builder" || "investor"}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div>
          <h1 className="text-[#F5F3ED] text-lg font-medium">Saved projects</h1>
          <p className="text-[#5C5A70] text-xs mt-0.5">
            {bookmarks.length} saved
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <Bookmark size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">No saved projects yet</p>
            <p className="text-[#5C5A70] text-xs text-center max-w-xs">
              Bookmark projects from the Explore feed to save them here
            </p>
            <button
              onClick={() => router.push("/dashboard/investor")}
              className="text-[#C9A84C] text-xs underline underline-offset-2"
            >
              Browse projects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookmarks.map((b) => {
              const p = b.projects;
              if (!p) return null;
              const raisedPct = getRaisedPercent(p.funding_goal, p.amount_raised);

              return (
                <div
                  key={b.id}
                  className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col gap-3 hover:border-[#5C5A70] transition"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {p.logo_url ? (
                        <Image
                          src={p.logo_url}
                          alt={p.name}
                          width={32}
                          height={32}
                          className="rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#C9A84C20] flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-[#C9A84C]">
                            {p.name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-[#F5F3ED] text-sm font-medium">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-1">
                          {p.profiles?.is_verified && (
                            <CheckCircle size={10} className="text-emerald-400" />
                          )}
                          <span className="text-[#5C5A70] text-xs">
                            {p.profiles?.full_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(p.id)}
                      title="Remove bookmark"
                    >
                      <Bookmark
                        size={15}
                        className="text-[#C9A84C] fill-[#C9A84C]"
                      />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {p.tier === "premium" && (
                      <Star size={11} className="text-[#C9A84C]" fill="#C9A84C" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.category === "web3"
                        ? "bg-purple-900 text-purple-300"
                        : "bg-blue-900 text-blue-300"
                    }`}>
                      {p.category?.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#5C5A70]">{p.sector}</span>
                  </div>

                  {/* Description */}
                  <p className="text-[#A8A6B8] text-xs leading-relaxed line-clamp-2">
                    {p.short_description}
                  </p>

                  {/* Metrics */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Goal</div>
                      <div className="text-[#F5F3ED] text-sm font-medium">
                        {formatCurrency(p.funding_goal)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Equity</div>
                      <div className="text-[#F5F3ED] text-sm font-medium">
                        {p.equity_offered}%
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[#5C5A70] text-xs mb-0.5">Raised</div>
                      <div className="text-[#C9A84C] text-sm font-medium">
                        {raisedPct}%
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="h-1.5 bg-[#2A2A3E] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full"
                      style={{ width: `${raisedPct}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startChat(p.profiles?.id, p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition"
                    >
                      <MessageCircle size={13} />
                      Chat
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/project/${p.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-[#3A3A52] text-[#A8A6B8] text-xs py-2 rounded-lg hover:border-[#5C5A70] transition"
                    >
                      <TrendingUp size={13} />
                      Details
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