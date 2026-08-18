"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/components/CurrencyProvider";

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
  banner_url?: string; // Updated from image_url to banner_url
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

export default function BuilderDashboard() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { features } = useSubscription();
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data);
  }, [supabase]);

  const fetchMyProjects = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("founder_id", user.id)
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void (async () => {
      await fetchMyProjects();
      await fetchProfile();
    })();
  }, [fetchMyProjects, fetchProfile]);

  const totalRaised = projects.reduce((sum, p) => sum + (p.amount_raised || 0), 0);
  const totalGoal = projects.reduce((sum, p) => sum + (p.funding_goal || 0), 0);

  return (
    <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username} >
      {/* Mobile bottom nav cutoff fix */}
      <div className="flex flex-col gap-4 pb-28 md:pb-4">

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

        {/* Find Investors */}
        <button
          onClick={() => router.push("/dashboard/investors")}
          className="w-full flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-4 py-3 hover:border-[#5C5A70] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C20] flex items-center justify-center">
              <TrendingUp size={16} className="text-[#C9A84C]" />
            </div>
            <div className="text-left">
              <div className="text-[#F5F3ED] text-sm font-medium">Find Investors</div>
              <div className="text-[#5C5A70] text-xs">Browse verified investors globally</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#5C5A70]" />
        </button>

        {/* Upload */}
        <button
  onClick={() => {
    if (features.maxProjects !== -1 && projects.length >= features.maxProjects) {
      router.push("/dashboard/upgrade");
    } else {
      router.push("/dashboard/builder/upload");
    }
  }}
  className="w-full flex items-center justify-between bg-[#C9A84C] text-[#1A1A2E] rounded-xl px-4 py-3 hover:opacity-90 transition"
>
  <div className="flex items-center gap-3">
    <Plus size={18} />
    <div className="text-left">
      <div className="text-sm font-medium">
        {features.maxProjects !== -1 && projects.length >= features.maxProjects
          ? "Upgrade to add more projects"
          : "Upload new project"
        }
      </div>
      <div className="text-xs opacity-70">
        {features.maxProjects !== -1 && projects.length >= features.maxProjects
          ? `Free plan: ${features.maxProjects} project limit`
          : "Connect with global investors"
        }
      </div>
    </div>
  </div>
  <ChevronRight size={16} />
</button>

        {/* My projects label */}
        <div>
          <span className="text-xs font-medium text-[#A8A6B8] uppercase tracking-wider">
            My projects
          </span>
        </div>

        {/* Projects list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <LayoutGrid size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">No projects yet</p>
            <button
              onClick={() => router.push("/dashboard/builder/upload")}
              className="text-[#C9A84C] text-xs underline underline-offset-2"
            >
              Upload your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Project Full-Bleed Banner Section */}
                  {p.banner_url ? (
                    <div className="mx-4 mt-4 mb-4 w-[calc(100%+32px)] aspect-21/9 bg-[#0F0F1A] border-b border-[#3A3A52]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={p.banner_url} 
                        alt={`${p.name} banner`} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    // Subtle top-margin spacer if a project has no banner to keep layouts tidy
                    <div className="pt-1" />
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {p.tier === "premium" && (
                          <Star size={11} className="text-[#C9A84C]" fill="#C9A84C" />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.tier === "premium" ? "bg-[#C9A84C20] text-[#C9A84C]" : "bg-[#2A2A3E] text-[#A8A6B8]"
                        }`}>
                          {p.tier?.charAt(0).toUpperCase() + p.tier?.slice(1)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          p.category === "web3" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"
                        }`}>
                          {p.category?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[#F5F3ED] text-sm font-medium">{p.name}</div>
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
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs py-2 rounded-lg hover:opacity-90 transition font-medium"
                  >
                    <TrendingUp size={13} /> Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}