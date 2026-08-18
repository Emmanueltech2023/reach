"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, ShieldCheck, TrendingUp, DollarSign, CheckCircle,
  X, Loader2, BarChart2, CreditCard, Clock, Search,
  Briefcase, MessageSquare, Pin, Trash2, ExternalLink,
  Shield, Check, AlertTriangle, FileText, Download,
  Layers, Settings, Sparkles, Filter, RefreshCw, ChevronRight,
  Globe, Mail, Lock, UserCheck, Eye, EyeOff
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  kyc_status: string;
  is_verified: boolean;
  created_at: string;
  country: string;
  subscription_tier: string;
  trust_score?: number;
  avatar_url?: string | null;
  preferred_currency?: string;
};

type UpgradeRequest = {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency?: string;
  reference: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    email?: string;
  };
};

type Project = {
  id: string;
  title: string;
  pitch: string;
  category: string;
  sector: string;
  target_raise?: number;
  raised_amount?: number;
  is_featured?: boolean;
  created_at: string;
  pitch_deck_url?: string | null;
  profiles?: {
    full_name: string;
    username: string;
    is_verified: boolean;
  };
};

type Job = {
  id: string;
  title: string;
  company_name: string;
  category: string;
  job_type: string;
  location_type: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
};

type CommunityPost = {
  id: string;
  title: string | null;
  content: string;
  category: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  image_url: string | null;
  profiles?: {
    full_name: string;
    username: string;
    is_verified: boolean;
  };
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // Data Collections
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    investors: 0,
    builders: 0,
    talent: 0,
    projects: 0,
    jobs: 0,
    communityPosts: 0,
    pendingKYC: 0,
    pendingUpgrades: 0,
    proSubscribers: 0,
    premiumSubscribers: 0,
    estimatedMRR: 0,
  });

  const showNotification = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data");
      const json = await res.json();

      const allProfiles: Profile[] = json.profiles || [];
      const projs: Project[] = json.projects || [];
      const jobList: Job[] = json.jobs || [];
      const postList: CommunityPost[] = json.communityPosts || [];
      const rawUpgrades: any[] = json.upgradeRequests || [];

      const formattedUpgrades: UpgradeRequest[] = rawUpgrades.map((upgrade: any) => {
        const matchingProfile = allProfiles.find((p) => p.id === upgrade.user_id);
        return {
          id: upgrade.id,
          user_id: upgrade.user_id,
          plan: upgrade.plan || "pro",
          amount: upgrade.amount || 0,
          currency: upgrade.currency || "USD",
          reference: upgrade.reference || "",
          status: upgrade.status || "pending",
          created_at: upgrade.created_at,
          profiles: {
            full_name: matchingProfile?.full_name || "User",
            username: matchingProfile?.username || "user",
          },
        };
      });

      const proCount = allProfiles.filter((p) => p.subscription_tier === "pro").length;
      const premiumCount = allProfiles.filter((p) => p.subscription_tier === "premium").length;

      setProfiles(allProfiles);
      setProjects(projs);
      setJobs(jobList);
      setCommunityPosts(postList);
      setUpgradeRequests(formattedUpgrades);

      setStats({
        totalUsers: allProfiles.length,
        verifiedUsers: allProfiles.filter((p) => p.is_verified).length,
        investors: allProfiles.filter((p) => p.role === "investor").length,
        builders: allProfiles.filter((p) => p.role === "builder").length,
        talent: allProfiles.filter((p) => p.role === "talent").length,
        projects: projs.length,
        jobs: jobList.length,
        communityPosts: postList.length,
        pendingKYC: allProfiles.filter((p) => p.kyc_status === "pending").length,
        pendingUpgrades: formattedUpgrades.filter((u) => u.status === "pending").length,
        proSubscribers: proCount,
        premiumSubscribers: premiumCount,
        estimatedMRR: proCount * 49 + premiumCount * 149,
      });
    } catch (err) {
      console.error("Admin data resolution failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchAdminData();
  }, [fetchAdminData]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────

  const approveKYC = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/kyc-approve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ userId, action: "approve" }),
      });

      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === userId ? { ...p, kyc_status: "approved", is_verified: true } : p
          )
        );
        setStats((prev) => ({
          ...prev,
          pendingKYC: Math.max(0, prev.pendingKYC - 1),
          verifiedUsers: prev.verifiedUsers + 1,
        }));
        showNotification("KYC identity approved successfully! ✓");
      }
    } catch (err) {
      console.error("KYC approval failed:", err);
    }
  };

  const rejectKYC = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/kyc-approve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ userId, action: "reject" }),
      });

      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === userId ? { ...p, kyc_status: "rejected", is_verified: false } : p
          )
        );
        setStats((prev) => ({
          ...prev,
          pendingKYC: Math.max(0, prev.pendingKYC - 1),
        }));
        showNotification("KYC rejected.");
      }
    } catch (err) {
      console.error("KYC rejection error:", err);
    }
  };

  const approveUpgrade = async (requestId: string, userId: string, plan: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/approve-upgrade", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ requestId, userId, plan, action: "approve" }),
      });

      if (res.ok) {
        setUpgradeRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r))
        );
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, subscription_tier: plan } : p))
        );
        setStats((prev) => ({
          ...prev,
          pendingUpgrades: Math.max(0, prev.pendingUpgrades - 1),
        }));
        showNotification(`Plan upgraded to ${plan.toUpperCase()}! 💳`);
      } else {
        const errJson = await res.json();
        showNotification(errJson.error || "Failed to approve upgrade");
      }
    } catch (err) {
      console.error("Upgrade approval error:", err);
    }
  };

  const rejectUpgrade = async (requestId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/approve-upgrade", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ requestId, action: "reject" }),
      });

      if (res.ok) {
        setUpgradeRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r))
        );
        setStats((prev) => ({
          ...prev,
          pendingUpgrades: Math.max(0, prev.pendingUpgrades - 1),
        }));
        showNotification("Upgrade request declined.");
      } else {
        const errJson = await res.json();
        showNotification(errJson.error || "Failed to reject upgrade");
      }
    } catch (err) {
      console.error("Upgrade rejection error:", err);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates: { role: newRole } }),
      });
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
        );
        showNotification(`User role updated to ${newRole}`);
      }
    } catch (err) {
      console.error("Role update failed:", err);
    }
  };

  const updateUserTier = async (userId: string, newTier: string) => {
    try {
      const targetTier = newTier.toLowerCase().trim();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates: { subscription_tier: targetTier } }),
      });
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, subscription_tier: targetTier } : p))
        );
        showNotification(`User plan updated to ${targetTier.toUpperCase()}`);
      }
    } catch (err) {
      console.error("Tier update failed:", err);
    }
  };

  const toggleUserVerified = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          updates: { is_verified: !currentStatus, kyc_status: !currentStatus ? "approved" : "rejected" },
        }),
      });
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, is_verified: !currentStatus } : p))
        );
        showNotification(`Verification status updated`);
      }
    } catch (err) {
      console.error("Verification toggle failed:", err);
    }
  };

  const toggleProjectFeatured = async (projectId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, updates: { is_featured: !currentStatus } }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, is_featured: !currentStatus } : p))
        );
        showNotification(`Project featured status updated`);
      }
    } catch (err) {
      console.error("Project featured toggle failed:", err);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        showNotification("Project deleted from platform.");
      }
    } catch (err) {
      console.error("Project deletion error:", err);
    }
  };

  const toggleJobPublished = async (jobId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, updates: { is_published: !currentStatus } }),
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, is_published: !currentStatus } : j))
        );
        showNotification("Job status updated");
      }
    } catch (err) {
      console.error("Job status update failed:", err);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job listing?")) return;
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        showNotification("Job removed.");
      }
    } catch (err) {
      console.error("Job deletion error:", err);
    }
  };

  const togglePostPinned = async (postId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, updates: { is_pinned: !currentStatus } }),
      });
      if (res.ok) {
        setCommunityPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_pinned: !currentStatus } : p))
        );
        showNotification("Forum discussion pin status updated");
      }
    } catch (err) {
      console.error("Post pin update failed:", err);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to remove this community post?")) return;
    try {
      const res = await fetch("/api/admin/community", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
        showNotification("Post deleted from community.");
      }
    } catch (err) {
      console.error("Post deletion error:", err);
    }
  };

  const exportUsersCSV = () => {
    const headers = ["ID", "Full Name", "Username", "Role", "Country", "Tier", "Verified", "KYC Status", "Created At"];
    const rows = profiles.map(p => [
      p.id,
      `"${p.full_name || ""}"`,
      p.username || "",
      p.role || "",
      p.country || "",
      p.subscription_tier || "free",
      p.is_verified ? "YES" : "NO",
      p.kyc_status || "none",
      p.created_at || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reach_users_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Users exported to CSV! 📥");
  };

  // Filtered lists based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.sector?.toLowerCase().includes(q) ||
        p.profiles?.full_name?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.company_name?.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  const TABS = [
    { id: "overview", label: "Executive Overview", icon: BarChart2 },
    { id: "kyc", label: "KYC Center", badge: stats.pendingKYC, icon: ShieldCheck },
    { id: "upgrades", label: "Subscriptions", badge: stats.pendingUpgrades, icon: CreditCard },
    { id: "users", label: `Users (${profiles.length})`, icon: Users },
    { id: "projects", label: `Projects (${projects.length})`, icon: TrendingUp },
    { id: "jobs", label: `Jobs & Talent (${jobs.length})`, icon: Briefcase },
    { id: "community", label: `Community (${communityPosts.length})`, icon: MessageSquare },
    { id: "docs", label: "System Architecture", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F5F3ED] flex flex-col selection:bg-[#C9A84C] selection:text-[#0A0A0F]">
      
      {/* Toast Notification */}
      {actionMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle size={15} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* TOP COMMAND HEADER */}
      <header className="border-b border-[#3A3A52]/80 bg-[#0F0F1A] px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#997828] flex items-center justify-center text-[#0A0A0F] font-black text-sm shadow-md">
              R
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#F5F3ED] flex items-center gap-2">
                <span>REACH Enterprise Command</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] font-semibold">
                  Admin OS
                </span>
              </h1>
              <div className="flex items-center gap-3 text-[11px] text-[#5C5A70]">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live System</span>
                <span>·</span>
                <span>Postgres & Cloudinary CDN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search size={14} className="absolute left-3 top-2.5 text-[#5C5A70]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, projects, jobs…"
              className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F5F3ED] placeholder-[#5C5A70] outline-none focus:border-[#C9A84C] w-64 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2 text-[#5C5A70] hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => void fetchAdminData()}
            className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#C9A84C]" : ""} />
          </button>

          <button
            onClick={() => router.push("/dashboard/investor")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-[#3A3A52] bg-[#1A1A2E] text-[#A8A6B8] hover:text-white hover:border-[#5C5A70] transition"
          >
            <span>Exit Admin</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </header>

      {/* HORIZONTAL NAVIGATION TABS */}
      <div className="bg-[#0F0F1A] border-b border-[#3A3A52]/60 px-6 py-2 overflow-x-auto scrollbar-none flex items-center gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition shrink-0 ${
                isActive
                  ? "bg-[#C9A84C] text-[#0A0A0F] font-bold shadow-md shadow-[#C9A84C]/20"
                  : "text-[#A8A6B8] hover:bg-[#1A1A2E] hover:text-[#F5F3ED]"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-[#0A0A0F] text-[#C9A84C]" : "bg-red-500 text-white"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader2 size={32} className="text-[#C9A84C] animate-spin" />
            <p className="text-xs text-[#5C5A70] tracking-wider uppercase font-semibold">Loading Admin Console Data…</p>
          </div>
        ) : (
          <>
            {/* 1. EXECUTIVE OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Total Members", value: stats.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Verified KYC", value: stats.verifiedUsers, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Active Startups", value: stats.projects, icon: TrendingUp, color: "text-[#C9A84C]", bg: "bg-[#C9A84C]/10" },
                    { label: "Live Job Openings", value: stats.jobs, icon: Briefcase, color: "text-purple-400", bg: "bg-purple-500/10" },
                    { label: "Discussions", value: stats.communityPosts, icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/10" },
                    { label: "Est. Monthly MRR", value: `$${stats.estimatedMRR.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  ].map((m, idx) => {
                    const Icon = m.icon;
                    return (
                      <div key={idx} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 shadow-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#5C5A70] font-medium uppercase">{m.label}</span>
                          <div className={`p-1.5 rounded-lg ${m.bg} ${m.color}`}>
                            <Icon size={14} />
                          </div>
                        </div>
                        <div className="text-xl font-bold text-[#F5F3ED] tracking-tight">{m.value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Role Breakdown & Action Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Role Distribution */}
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-4">
                    <h3 className="text-sm font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-2">
                      <Layers size={15} className="text-[#C9A84C]" />
                      <span>Role Distribution</span>
                    </h3>
                    <div className="space-y-3 pt-1">
                      {[
                        { label: "Investors & VCs", count: stats.investors, color: "bg-emerald-400", pct: stats.totalUsers ? (stats.investors / stats.totalUsers) * 100 : 0 },
                        { label: "Startup Builders", count: stats.builders, color: "bg-blue-400", pct: stats.totalUsers ? (stats.builders / stats.totalUsers) * 100 : 0 },
                        { label: "Job Seekers / Talent", count: stats.talent, color: "bg-purple-400", pct: stats.totalUsers ? (stats.talent / stats.totalUsers) * 100 : 0 },
                      ].map((r, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#A8A6B8]">{r.label}</span>
                            <span className="font-bold text-[#F5F3ED]">{r.count} ({Math.round(r.pct)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-[#0F0F1A] rounded-full overflow-hidden border border-[#3A3A52]">
                            <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Action Desk */}
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-3">
                    <h3 className="text-sm font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-2">
                      <Clock size={15} className="text-yellow-400" />
                      <span>Pending Queue</span>
                    </h3>
                    <div className="space-y-2 pt-1">
                      <div 
                        onClick={() => setActiveTab("kyc")}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] hover:border-[#C9A84C] transition cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#F5F3ED]">Identity Verifications</p>
                          <p className="text-[10px] text-[#5C5A70]">Requires admin document review</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-xs">
                          {stats.pendingKYC} Pending
                        </span>
                      </div>

                      <div 
                        onClick={() => setActiveTab("upgrades")}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] hover:border-[#C9A84C] transition cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#F5F3ED]">Subscription Upgrades</p>
                          <p className="text-[10px] text-[#5C5A70]">Payment reference verification</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-bold text-xs">
                          {stats.pendingUpgrades} Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Infrastructure Status */}
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-3">
                    <h3 className="text-sm font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-2">
                      <Shield size={15} className="text-emerald-400" />
                      <span>Live Infrastructure</span>
                    </h3>
                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F0F1A] border border-[#3A3A52]">
                        <span className="text-[#A8A6B8]">Media CDN</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cloudinary
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F0F1A] border border-[#3A3A52]">
                        <span className="text-[#A8A6B8]">Database</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Supabase Postgres
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F0F1A] border border-[#3A3A52]">
                        <span className="text-[#A8A6B8]">Email Service</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Resend API
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KYC & IDENTITY TAB */}
            {activeTab === "kyc" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">KYC & Identity Review</h2>
                    <p className="text-xs text-[#5C5A70]">Verify founder and investor credentials before unlocking deal privileges</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
                    {stats.pendingKYC} Requests Awaiting Review
                  </span>
                </div>

                {profiles.filter((p) => p.kyc_status === "pending").length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center space-y-2">
                    <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                    <h3 className="text-sm font-bold text-[#F5F3ED]">All caught up!</h3>
                    <p className="text-xs text-[#5C5A70]">There are no pending KYC applications at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles
                      .filter((p) => p.kyc_status === "pending")
                      .map((user) => (
                        <div key={user.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 space-y-4 shadow-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#C9A84C20] border border-[#3A3A52] flex items-center justify-center font-bold text-[#C9A84C]">
                                {user.full_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#F5F3ED]">{user.full_name}</h3>
                                <p className="text-xs text-[#5C5A70]">@{user.username} · {user.country || "Global"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#2A2A3E] text-[#A8A6B8] border border-[#3A3A52] capitalize">
                              {user.role}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs space-y-1">
                            <div className="flex justify-between text-[#A8A6B8]">
                              <span>Account ID:</span>
                              <span className="font-mono text-[10px] text-[#5C5A70]">{user.id.slice(0, 12)}…</span>
                            </div>
                            <div className="flex justify-between text-[#A8A6B8]">
                              <span>Applied:</span>
                              <span className="text-[#F5F3ED]">{new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => approveKYC(user.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
                            >
                              <Check size={14} />
                              <span>Approve & Verify</span>
                            </button>
                            <button
                              onClick={() => rejectKYC(user.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 transition"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. SUBSCRIPTIONS & REVENUE TAB */}
            {activeTab === "upgrades" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">Subscription Upgrade Requests</h2>
                    <p className="text-xs text-[#5C5A70]">Review manual and automated subscription payments</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-bold">
                    {stats.pendingUpgrades} Pending Approvals
                  </span>
                </div>

                {upgradeRequests.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center text-xs text-[#5C5A70]">
                    No upgrade requests recorded.
                  </div>
                ) : (
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#A8A6B8]">
                        <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[11px] uppercase font-bold text-[#5C5A70]">
                          <tr>
                            <th className="px-5 py-3.5">User</th>
                            <th className="px-5 py-3.5">Target Plan</th>
                            <th className="px-5 py-3.5">Amount</th>
                            <th className="px-5 py-3.5">Reference ID</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3A3A52]/50">
                          {upgradeRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-[#2A2A3E]/40 transition">
                              <td className="px-5 py-3.5 font-medium text-[#F5F3ED]">
                                <div>{req.profiles?.full_name || "User"}</div>
                                <div className="text-[10px] text-[#5C5A70]">@{req.profiles?.username}</div>
                              </td>
                              <td className="px-5 py-3.5 font-bold uppercase text-[#C9A84C]">{req.plan}</td>
                              <td className="px-5 py-3.5 font-semibold text-[#F5F3ED]">{req.currency} {req.amount}</td>
                              <td className="px-5 py-3.5 font-mono text-[10px] text-[#5C5A70]">{req.reference || "N/A"}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  req.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : req.status === "rejected"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                {req.status === "pending" ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => approveUpgrade(req.id, req.user_id, req.plan)}
                                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => rejectUpgrade(req.id)}
                                      className="px-3 py-1 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 font-bold text-[11px] hover:bg-red-600/30 transition"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[#5C5A70] text-[11px]">Processed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. USER MANAGEMENT TAB */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">Platform User Directory</h2>
                    <p className="text-xs text-[#5C5A70]">Inspect, manage roles, adjust tiers, and export records</p>
                  </div>
                  <button
                    onClick={exportUsersCSV}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition shadow-md"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#A8A6B8]">
                      <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[11px] uppercase font-bold text-[#5C5A70]">
                        <tr>
                          <th className="px-5 py-3.5">User</th>
                          <th className="px-5 py-3.5">Role</th>
                          <th className="px-5 py-3.5">Country</th>
                          <th className="px-5 py-3.5">Plan Tier</th>
                          <th className="px-5 py-3.5">Verified</th>
                          <th className="px-5 py-3.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A3A52]/50">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-[#2A2A3E]/30 transition">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-[#F5F3ED]">{user.full_name}</div>
                              <div className="text-[10px] text-[#5C5A70]">@{user.username}</div>
                            </td>
                            <td className="px-5 py-3.5">
                              <select
                                value={user.role || "investor"}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                className="bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#A8A6B8] rounded-lg px-2 py-1 outline-none capitalize"
                              >
                                <option value="investor">Investor</option>
                                <option value="builder">Builder</option>
                                <option value="talent">Talent</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-5 py-3.5 font-medium">{user.country || "—"}</td>
                            <td className="px-5 py-3.5">
                              <select
                                value={(user.subscription_tier || "free").toLowerCase()}
                                onChange={(e) => updateUserTier(user.id, e.target.value)}
                                className={`border border-[#3A3A52] text-xs rounded-lg px-2 py-1 outline-none font-bold bg-[#0F0F1A] ${
                                  user.subscription_tier === "premium"
                                    ? "text-purple-400 border-purple-500/40"
                                    : user.subscription_tier === "pro"
                                    ? "text-[#C9A84C] border-[#C9A84C]/40"
                                    : "text-[#5C5A70]"
                                }`}
                              >
                                <option value="free">Free</option>
                                <option value="pro">Pro ($49)</option>
                                <option value="premium">Premium ($149)</option>
                              </select>
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => toggleUserVerified(user.id, user.is_verified)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                                  user.is_verified
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : "bg-[#2A2A3E] border-[#3A3A52] text-[#5C5A70]"
                                }`}
                              >
                                {user.is_verified ? "Verified ✓" : "Unverified"}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[10px] text-[#5C5A70] font-mono">{user.id.slice(0, 8)}…</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PROJECTS MANAGEMENT TAB */}
            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">Startup Deal Flow & Projects</h2>
                    <p className="text-xs text-[#5C5A70]">Manage pitch decks, whitepapers, and featured placement</p>
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center text-xs text-[#5C5A70]">
                    No projects found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProjects.map((proj) => (
                      <div key={proj.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-[#F5F3ED]">{proj.title}</h3>
                            <p className="text-xs text-[#5C5A70]">By {proj.profiles?.full_name || "Founder"} · Sector: {proj.sector || "General"}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-semibold uppercase">
                            {proj.category}
                          </span>
                        </div>

                        <p className="text-xs text-[#A8A6B8] line-clamp-2 leading-relaxed">{proj.pitch}</p>

                        <div className="flex items-center justify-between border-t border-[#3A3A52]/60 pt-3">
                          <div className="flex items-center gap-2">
                            {proj.pitch_deck_url && (
                              <a
                                href={proj.pitch_deck_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-[#C9A84C] hover:underline"
                              >
                                <FileText size={13} />
                                <span>Pitch Deck</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleProjectFeatured(proj.id, !!proj.is_featured)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                                proj.is_featured
                                  ? "bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C]"
                                  : "bg-[#0F0F1A] text-[#5C5A70] border-[#3A3A52] hover:text-white"
                              }`}
                            >
                              {proj.is_featured ? "Featured ⭐" : "Feature"}
                            </button>

                            <button
                              onClick={() => deleteProject(proj.id)}
                              className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition"
                              title="Delete Project"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. JOBS & TALENT TAB */}
            {activeTab === "jobs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">Talent Job Listings</h2>
                    <p className="text-xs text-[#5C5A70]">Monitor all posted Web2 & Web3 jobs across the network</p>
                  </div>
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center text-xs text-[#5C5A70]">
                    No jobs posted yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredJobs.map((job) => (
                      <div key={job.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-[#F5F3ED]">{job.title}</h3>
                            <p className="text-xs text-[#5C5A70]">{job.company_name} · Posted by @{job.profiles?.username || "user"}</p>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase ${
                            job.is_published ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#2A2A3E] border-[#3A3A52] text-[#5C5A70]"
                          }`}>
                            {job.is_published ? "Active" : "Draft"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#A8A6B8]">
                          <span className="capitalize">{job.job_type.replace("_", " ")}</span>
                          <span>·</span>
                          <span className="capitalize">{job.location_type}</span>
                          {job.salary_min && (
                            <>
                              <span>·</span>
                              <span className="text-[#C9A84C] font-semibold">{job.salary_currency || "USD"} {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-[#3A3A52]/60 pt-3">
                          <span className="text-[10px] text-[#5C5A70]">Category: {job.category}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleJobPublished(job.id, job.is_published)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white"
                            >
                              {job.is_published ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => deleteJob(job.id)}
                              className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. COMMUNITY MODERATION TAB */}
            {activeTab === "community" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED]">Community Discussions Moderation</h2>
                    <p className="text-xs text-[#5C5A70]">Moderate social posts, pin announcements, and remove spam</p>
                  </div>
                </div>

                {communityPosts.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center text-xs text-[#5C5A70]">
                    No discussions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communityPosts.map((post) => (
                      <div key={post.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#F5F3ED]">
                              {post.is_anonymous ? "Anonymous" : post.profiles?.full_name || "Member"}
                            </span>
                            <span className="text-xs text-[#5C5A70]">@{post.profiles?.username || "user"}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#0F0F1A] border border-[#3A3A52] capitalize text-[#A8A6B8]">
                              {post.category}
                            </span>
                            {post.is_pinned && (
                              <span className="text-[10px] text-[#C9A84C] font-bold flex items-center gap-0.5">
                                <Pin size={10} /> Pinned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => togglePostPinned(post.id, post.is_pinned)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-[#3A3A52] bg-[#0F0F1A] text-[#A8A6B8] hover:text-white"
                            >
                              {post.is_pinned ? "Unpin" : "Pin to Top"}
                            </button>
                            <button
                              onClick={() => deletePost(post.id)}
                              className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {post.title && <h3 className="text-sm font-bold text-[#F5F3ED]">{post.title}</h3>}
                        <p className="text-xs text-[#A8A6B8] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                        {post.image_url && (
                          <div className="rounded-xl border border-[#3A3A52] overflow-hidden bg-black/40 max-h-48 w-fit">
                            <img src={post.image_url} alt="Attachment" className="max-h-48 object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. SYSTEM ARCHITECTURE & DOCUMENTATION TAB */}
            {activeTab === "docs" && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                    <Settings size={18} className="text-[#C9A84C]" />
                    <span>REACH Operating System Architecture & Data Schema</span>
                  </h2>
                  <p className="text-xs text-[#5C5A70] mt-0.5">Official operational documentation and integration specifications</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#C9A84C]">Core Services</h3>
                    <div className="p-4 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-[#A8A6B8]">Database Engine:</span>
                        <span className="text-[#F5F3ED] font-mono">PostgreSQL (Supabase RLS)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8A6B8]">Storage & Media Pipeline:</span>
                        <span className="text-[#F5F3ED] font-mono">Cloudinary Global CDN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8A6B8]">Realtime WebSocket:</span>
                        <span className="text-[#F5F3ED] font-mono">Supabase Realtime v2</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A8A6B8]">Transactional Emails:</span>
                        <span className="text-[#F5F3ED] font-mono">Resend API (v2 SDK)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#C9A84C]">Primary Database Tables</h3>
                    <div className="p-4 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs space-y-2 font-mono text-[#A8A6B8]">
                      <div>• <span className="text-[#F5F3ED]">profiles</span>: Users, KYC status, tiers, trust scores</div>
                      <div>• <span className="text-[#F5F3ED]">projects</span>: Startup pitch decks, whitepapers, sectors</div>
                      <div>• <span className="text-[#F5F3ED]">jobs & applications</span>: Postings, resumes, candidates</div>
                      <div>• <span className="text-[#F5F3ED]">community_posts</span>: Discussions, likes, media links</div>
                      <div>• <span className="text-[#F5F3ED]">messages & conversations</span>: Direct chats, calls</div>
                      <div>• <span className="text-[#F5F3ED]">upgrade_requests</span>: Payment references & plan logs</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}