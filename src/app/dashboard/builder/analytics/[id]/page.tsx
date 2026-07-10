"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  TrendingUp, Eye, MessageCircle,
  Bookmark, ArrowLeft, Loader2, MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  short_description: string;
  funding_goal: number;
  equity_offered: number;
  amount_raised: number;
  view_count: number;
  tier: string;
  category: string;
  sector: string;
};

type ViewRecord = {
  id: string;
  viewed_at: string;
  profiles: {
    full_name: string;
    country: string | null;
    role: string;
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

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [views, setViews] = useState<ViewRecord[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
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

    // Fetch project
    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .eq("founder_id", user.id)
      .single();
    if (proj) setProject(proj);

    // Fetch views with viewer profiles
    const { data: viewsData } = await supabase
      .from("project_views")
      .select(`*, profiles(full_name, country, role)`)
      .eq("project_id", params.id)
      .order("viewed_at", { ascending: false })
      .limit(50);
    setViews(viewsData || []);

    // Count bookmarks
    const { count: bCount } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("project_id", params.id);
    setBookmarkCount(bCount || 0);

    // Count conversations
    const { count: cCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("project_id", params.id);
    setChatCount(cCount || 0);

    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  // Group views by country
  const viewsByCountry = views.reduce((acc, v) => {
    const country = v.profiles?.country || "Unknown";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCountries = Object.entries(viewsByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCountryViews = topCountries[0]?.[1] || 1;

  // Group views by day for chart
  const viewsByDay = views.reduce((acc, v) => {
    const day = new Date(v.viewed_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const maxDayViews = Math.max(...last7Days.map((d) => viewsByDay[d] || 0), 1);

  if (loading) {
    return (
      <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!project) {
    return (
      <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[#5C5A70] text-sm">Project not found</p>
          <button onClick={() => router.back()} className="text-[#C9A84C] text-sm">Go back</button>
        </div>
      </DashboardShell>
    );
  }

  const raisedPct = getRaisedPercent(project.funding_goal, project.amount_raised);

  return (
    <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/builder")}>
            <ArrowLeft size={20} className="text-[#A8A6B8]" />
          </button>
          <div>
            <h1 className="text-[#F5F3ED] text-lg font-medium">{project.name}</h1>
            <p className="text-[#5C5A70] text-xs">Analytics dashboard</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={15} className="text-[#C9A84C]" />
              <span className="text-[#5C5A70] text-xs">Total views</span>
            </div>
            <div className="text-[#F5F3ED] text-2xl font-medium">
              {project.view_count || views.length}
            </div>
            <div className="text-[#5C5A70] text-xs mt-1">
              {views.filter((v) => {
                const d = new Date(v.viewed_at);
                const now = new Date();
                return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
              }).length} this week
            </div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bookmark size={15} className="text-[#C9A84C]" />
              <span className="text-[#5C5A70] text-xs">Bookmarks</span>
            </div>
            <div className="text-[#F5F3ED] text-2xl font-medium">{bookmarkCount}</div>
            <div className="text-[#5C5A70] text-xs mt-1">Saved by investors</div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={15} className="text-[#C9A84C]" />
              <span className="text-[#5C5A70] text-xs">Conversations</span>
            </div>
            <div className="text-[#F5F3ED] text-2xl font-medium">{chatCount}</div>
            <div className="text-[#5C5A70] text-xs mt-1">Investors reached out</div>
          </div>
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-[#C9A84C]" />
              <span className="text-[#5C5A70] text-xs">Raised</span>
            </div>
            <div className="text-[#F5F3ED] text-2xl font-medium">{raisedPct}%</div>
            <div className="text-[#5C5A70] text-xs mt-1">
              {formatCurrency(project.amount_raised)} of {formatCurrency(project.funding_goal)}
            </div>
          </div>
        </div>

        {/* Funding progress */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">Funding progress</h2>
          <div className="h-3 bg-[#2A2A3E] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#C9A84C] rounded-full transition-all"
              style={{ width: `${raisedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#5C5A70]">
            <span>{formatCurrency(project.amount_raised)} raised</span>
            <span>{formatCurrency(project.funding_goal)} goal</span>
          </div>
        </div>

        {/* Views over time */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-4">Views — last 7 days</h2>
          <div className="flex items-end gap-2 h-24">
            {last7Days.map((day) => {
              const count = viewsByDay[day] || 0;
              const heightPct = maxDayViews > 0 ? (count / maxDayViews) * 100 : 0;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                    <div
                      className="w-full bg-[#C9A84C] rounded-t-sm transition-all"
                      style={{ height: `${Math.max(heightPct, count > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[#5C5A70] text-xs">{day.split(" ")[1]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Views by country */}
        {topCountries.length > 0 && (
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">Views by region</h2>
            <div className="flex flex-col gap-3">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-28 shrink-0">
                    <MapPin size={11} className="text-[#5C5A70]" />
                    <span className="text-[#A8A6B8] text-xs truncate">{country}</span>
                  </div>
                  <div className="flex-1 h-2 bg-[#2A2A3E] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9A84C] rounded-full"
                      style={{ width: `${(count / maxCountryViews) * 100}%` }}
                    />
                  </div>
                  <span className="text-[#F5F3ED] text-xs font-medium w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent viewers */}
        {views.length > 0 && (
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
            <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">
              Recent viewers
            </h2>
            <div className="flex flex-col gap-2">
              {views.slice(0, 10).map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-[#3A3A52] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0">
                    {v.profiles?.full_name?.[0] || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="text-[#F5F3ED] text-xs font-medium">
                      {v.profiles?.full_name || "Anonymous"}
                    </div>
                    <div className="text-[#5C5A70] text-xs capitalize">
                      {v.profiles?.role || "User"}
                      {v.profiles?.country ? ` · ${v.profiles.country}` : ""}
                    </div>
                  </div>
                  <div className="text-[#5C5A70] text-xs">
                    {new Date(v.viewed_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}