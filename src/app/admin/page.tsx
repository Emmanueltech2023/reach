"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, ShieldCheck, TrendingUp, DollarSign,
  CheckCircle, X, Loader2,
  BarChart2, CreditCard, Clock,
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
};

type UpgradeRequest = {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  reference: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    email: string;
  };
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState("overview");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    investors: 0,
    builders: 0,
    projects: 0,
    pendingKYC: 0,
    pendingUpgrades: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: profs } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    const { data: upgrades } = await supabase
      .from("upgrade_requests")
      .select(`*, profiles(full_name, username)`)
      .order("created_at", { ascending: false })
      .limit(50);

    setProfiles(profs || []);
    setUpgradeRequests(upgrades || []);
    setStats({
      totalUsers: profs?.length || 0,
      verifiedUsers: profs?.filter((p) => p.is_verified).length || 0,
      investors: profs?.filter((p) => p.role === "investor").length || 0,
      builders: profs?.filter((p) => p.role === "builder").length || 0,
      projects: projectCount || 0,
      pendingKYC: profs?.filter((p) => p.kyc_status === "pending").length || 0,
      pendingUpgrades: upgrades?.filter((u) => u.status === "pending").length || 0,
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      await fetchData();
    };

    void load();
  }, [fetchData]);

  const approveKYC = async (userId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  await fetch("/api/admin/kyc-approve", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}` 
    },
    body: JSON.stringify({ userId, action: "approve" }),
  });
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId
          ? { ...p, kyc_status: "approved", is_verified: true }
          : p
      )
    );
    setStats((prev) => ({ ...prev, pendingKYC: prev.pendingKYC - 1 }));
  };

  const rejectKYC = async (userId: string) => {
    await fetch("/api/admin/kyc-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "reject" }),
    });
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId ? { ...p, kyc_status: "rejected" } : p
      )
    );
    setStats((prev) => ({ ...prev, pendingKYC: prev.pendingKYC - 1 }));
  };

  const approveUpgrade = async (requestId: string, userId: string, plan: string) => {
    await fetch("/api/admin/approve-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userId, plan }),
    });
    setUpgradeRequests((prev) =>
      prev.map((r) => r.id === requestId ? { ...r, status: "approved" } : r)
    );
    setStats((prev) => ({ ...prev, pendingUpgrades: prev.pendingUpgrades - 1 }));
  };

  const rejectUpgrade = async (requestId: string) => {
    await fetch("/api/admin/approve-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action: "reject" }),
    });
    setUpgradeRequests((prev) =>
      prev.map((r) => r.id === requestId ? { ...r, status: "rejected" } : r)
    );
    setStats((prev) => ({ ...prev, pendingUpgrades: prev.pendingUpgrades - 1 }));
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "kyc", label: `KYC (${stats.pendingKYC})`, icon: ShieldCheck },
    { id: "upgrades", label: `Upgrades (${stats.pendingUpgrades})`, icon: CreditCard },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1A]">

      {/* Header */}
      <header className="border-b border-[#3A3A52] px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-medium text-[#F5F3ED]">
          i<span className="text-[#C9A84C]">Vest</span>
          <span className="text-[#5C5A70] text-sm font-normal ml-2">Admin</span>
        </h1>
        <div className="flex-1" />
        <button
          onClick={() => router.push("/dashboard/investor")}
          className="text-[#5C5A70] text-sm hover:text-[#A8A6B8] transition"
        >
          Back to app
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A2E] border border-[#3A3A52] rounded-lg p-1 mb-6 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition ${
                  activeTab === tab.id
                    ? "bg-[#C9A84C] text-[#1A1A2E] font-medium"
                    : "text-[#5C5A70] hover:text-[#A8A6B8]"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
                    { label: "Verified", value: stats.verifiedUsers, icon: CheckCircle, color: "text-emerald-400" },
                    { label: "Projects", value: stats.projects, icon: TrendingUp, color: "text-[#C9A84C]" },
                    { label: "Pending KYC", value: stats.pendingKYC, icon: Clock, color: "text-yellow-400" },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={15} className={s.color} />
                          <span className="text-[#5C5A70] text-xs">{s.label}</span>
                        </div>
                        <div className="text-[#F5F3ED] text-2xl font-medium">{s.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                    <h3 className="text-[#F5F3ED] text-sm font-medium mb-3">Users by role</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#A8A6B8]">Investors</span>
                        <span className="text-[#C9A84C] font-medium">{stats.investors}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#A8A6B8]">Builders</span>
                        <span className="text-[#C9A84C] font-medium">{stats.builders}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                    <h3 className="text-[#F5F3ED] text-sm font-medium mb-3">Pending actions</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#A8A6B8]">KYC reviews</span>
                        <span className={`font-medium ${stats.pendingKYC > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                          {stats.pendingKYC}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#A8A6B8]">Upgrade requests</span>
                        <span className={`font-medium ${stats.pendingUpgrades > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
                          {stats.pendingUpgrades}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KYC Review */}
            {activeTab === "kyc" && (
              <div className="flex flex-col gap-3">
                {profiles.filter((p) => p.kyc_status === "pending").length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
                    <CheckCircle size={28} className="text-emerald-400" />
                    <p className="text-[#5C5A70] text-sm">All KYC reviews complete</p>
                  </div>
                ) : (
                  profiles.filter((p) => p.kyc_status === "pending").map((p) => (
                    <div key={p.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0">
                        {p.full_name?.[0] || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="text-[#F5F3ED] text-sm font-medium">{p.full_name}</div>
                        <div className="text-[#5C5A70] text-xs">
                          @{p.username} · {p.role} · {p.country || "Unknown country"}
                        </div>
                        <div className="text-[#5C5A70] text-xs mt-0.5">
                          Registered {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveKYC(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs rounded-lg hover:bg-emerald-900/50 transition"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => rejectKYC(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg hover:bg-red-900/50 transition"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Upgrade Requests */}
            {activeTab === "upgrades" && (
              <div className="flex flex-col gap-3">
                {upgradeRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
                    <DollarSign size={28} className="text-[#3A3A52]" />
                    <p className="text-[#5C5A70] text-sm">No upgrade requests yet</p>
                  </div>
                ) : (
                  upgradeRequests.map((req) => (
                    <div key={req.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-[#F5F3ED] text-sm font-medium">
                            {req.profiles?.full_name}
                          </div>
                          <div className="text-[#5C5A70] text-xs">
                            @{req.profiles?.username} · {req.plan} plan · ${req.amount}
                          </div>
                          <div className="text-[#5C5A70] text-xs mt-1">
                            Reference: <span className="text-[#A8A6B8] font-mono">{req.reference}</span>
                          </div>
                          <div className="text-[#5C5A70] text-xs">
                            {new Date(req.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                          req.status === "approved"
                            ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                            : req.status === "rejected"
                            ? "bg-red-900/30 text-red-400 border-red-800"
                            : "bg-yellow-900/30 text-yellow-400 border-yellow-800"
                        }`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveUpgrade(req.id, req.user_id, req.plan)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs rounded-lg hover:bg-emerald-900/50 transition"
                          >
                            <CheckCircle size={13} /> Approve & Activate
                          </button>
                          <button
                            onClick={() => rejectUpgrade(req.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg hover:bg-red-900/50 transition"
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* All Users */}
            {activeTab === "users" && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3A3A52]">
                      <th className="text-left px-4 py-3 text-[#5C5A70] text-xs font-medium uppercase">User</th>
                      <th className="text-left px-4 py-3 text-[#5C5A70] text-xs font-medium uppercase">Role</th>
                      <th className="text-left px-4 py-3 text-[#5C5A70] text-xs font-medium uppercase">KYC</th>
                      <th className="text-left px-4 py-3 text-[#5C5A70] text-xs font-medium uppercase">Plan</th>
                      <th className="text-left px-4 py-3 text-[#5C5A70] text-xs font-medium uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p, i) => (
                      <tr key={p.id} className={`border-b border-[#3A3A52] hover:bg-[#0F0F1A] transition ${i === profiles.length - 1 ? "border-0" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0">
                              {p.full_name?.[0] || "?"}
                            </div>
                            <div>
                              <div className="text-[#F5F3ED] text-xs font-medium">{p.full_name}</div>
                              <div className="text-[#5C5A70] text-xs">@{p.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs capitalize font-medium ${
                            p.role === "investor" ? "text-blue-400" : "text-emerald-400"
                          }`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            p.kyc_status === "approved"
                              ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                              : p.kyc_status === "rejected"
                              ? "bg-red-900/30 text-red-400 border-red-800"
                              : "bg-yellow-900/30 text-yellow-400 border-yellow-800"
                          }`}>
                            {p.kyc_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[#A8A6B8] capitalize">
                            {p.subscription_tier || "free"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[#5C5A70]">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}