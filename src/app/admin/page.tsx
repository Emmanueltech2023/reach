"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users, ShieldCheck, TrendingUp, DollarSign, CheckCircle,
  X, Loader2, BarChart2, CreditCard, Clock, Search,
  Briefcase, MessageSquare, Pin, Trash2, ExternalLink,
  Shield, Check, AlertTriangle, FileText, Download,
  Layers, Settings, Sparkles, Filter, RefreshCw, ChevronRight,
  Globe, Mail, Lock, UserCheck, Eye, EyeOff,
  Edit, Ban, AlertOctagon, UserX, Star, ShieldAlert,
  KeyRound, Activity, Terminal, Smartphone, Megaphone,
  Receipt, Share2, AlertCircle, Send, Award
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
  is_scam?: boolean;
  is_banned?: boolean;
  bio?: string | null;
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
  
  // Dedicated Admin Auth & Session State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean | null>(null);
  const [adminLoginForm, setAdminLoginForm] = useState({ email: "", password: "" });
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // PIN-Gated Universal Audit Vault States
  const [auditUnlocked, setAuditUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("admin_audit_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [auditPasscode, setAuditPasscode] = useState(() => {
    try {
      return sessionStorage.getItem("admin_passcode") || "";
    } catch {
      return "";
    }
  });
  const [auditPasscodeError, setAuditPasscodeError] = useState<string | null>(null);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditFilter, setAuditFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");

  // Passcode Settings Modal State
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  const [passcodeChangeMsg, setPasscodeChangeMsg] = useState<string | null>(null);

  // User Filtering and Editing States
  const [userFilter, setUserFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Profile>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // System Domain Collections
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [upgradeFilter, setUpgradeFilter] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [msgSubTab, setMsgSubTab] = useState<"flagged" | "all">("flagged");
  const [inspectingConversation, setInspectingConversation] = useState<any | null>(null);

  // Pre-Launch Waitlist Leads
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [waitlistFilter, setWaitlistFilter] = useState("all");
  const [updatingWaitlistId, setUpdatingWaitlistId] = useState<string | null>(null);

  // Notification & Broadcast Modals
  const [broadcastForm, setBroadcastForm] = useState({ target: "all", userId: "", title: "", body: "", actionUrl: "" });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [notifyUserModal, setNotifyUserModal] = useState<Profile | null>(null);
  const [notifyForm, setNotifyForm] = useState({ title: "", body: "", actionUrl: "" });
  const [sendingNotify, setSendingNotify] = useState(false);
  const [kycRejectionReason, setKycRejectionReason] = useState("");
  const [rejectingKycUser, setRejectingKycUser] = useState<Profile | null>(null);

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

  const notifTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showNotification = useCallback((msg: string) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setActionMessage(msg);
    notifTimerRef.current = setTimeout(() => {
      setActionMessage(null);
    }, 3500);
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsAdminAuthenticated(false);
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [resData, resDeals, resInvoices, resReferrals, resMessages] = await Promise.all([
        fetch("/api/admin/data", { headers }),
        fetch("/api/admin/deals", { headers }),
        fetch("/api/admin/invoices", { headers }),
        fetch("/api/admin/referrals", { headers }),
        fetch("/api/admin/messages", { headers }),
      ]);

      const json = await resData.json();

      if (!resData.ok || json.error) {
        setIsAdminAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAdminAuthenticated(true);

      const jsonDeals = await resDeals.json().catch(() => ({ deals: [] }));
      const jsonInvoices = await resInvoices.json().catch(() => ({ invoices: [] }));
      const jsonReferrals = await resReferrals.json().catch(() => ({ referrals: [], topReferrers: [] }));
      const jsonMessages = await resMessages.json().catch(() => ({ flags: [] }));

      setDeals(jsonDeals.deals || []);
      setInvoices(jsonInvoices.invoices || []);
      setReferrals(jsonReferrals.referrals || []);
      setTopReferrers(jsonReferrals.topReferrers || []);
      setFlaggedMessages(jsonMessages.flags || []);
      setConversations(jsonMessages.conversations || []);

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
      setWaitlistEntries(json.waitlistEntries || []);

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
      setIsAdminAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (code: string) => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?passcode=${encodeURIComponent(code)}&filter=${auditFilter}&search=${encodeURIComponent(auditSearch)}`);
      const json = await res.json();
      if (res.ok) {
        setAuditLogs(json.logs || []);
        setAuditPasscodeError(null);
      } else {
        setAuditPasscodeError(json.error || "Access Denied");
      }
    } catch (e) {
      setAuditPasscodeError("Network error fetching audit logs");
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [auditFilter, auditSearch]);

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingPasscode(true);
    setAuditPasscodeError(null);
    try {
      const res = await fetch("/api/admin/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: auditPasscode }),
      });
      const json = await res.json();
      if (res.ok && json.valid) {
        setAuditUnlocked(true);
        try {
          sessionStorage.setItem("admin_audit_unlocked", "true");
          sessionStorage.setItem("admin_passcode", auditPasscode);
        } catch {}
        await fetchAuditLogs(auditPasscode);
      } else {
        setAuditPasscodeError(json.error || "Incorrect Passcode");
      }
    } catch {
      setAuditPasscodeError("Passcode verification failed");
    } finally {
      setVerifyingPasscode(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginLoading(true);
    setAdminLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminLoginForm.email,
        password: adminLoginForm.password,
      });

      if (error) {
        setAdminLoginError(error.message);
        setAdminLoginLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role !== "admin") {
          setAdminLoginError("Access Denied: You do not have administrator permissions.");
          await supabase.auth.signOut();
          setAdminLoginLoading(false);
          return;
        }

        setIsAdminAuthenticated(true);
        await fetchAdminData();
      }
    } catch (err: any) {
      setAdminLoginError(err.message || "Admin login failed");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("admin_audit_unlocked");
        sessionStorage.removeItem("admin_passcode");
        sessionStorage.removeItem("user_role");
        localStorage.removeItem("user_role");
      }
      await supabase.auth.signOut();
      setIsAdminAuthenticated(false);
      showNotification("Signed out of Admin session successfully.");
    } catch (err) {
      console.error("Admin logout error:", err);
    }
  };

  useEffect(() => {
    void fetchAdminData();

    // Supabase Realtime subscription on profiles table for instant KYC & signup popups
    const channel = supabase
      .channel("admin-realtime-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void fetchAdminData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminData, supabase]);

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
      const normalizedPlan = (plan || "pro").toLowerCase().trim() === "premium" ? "premium" : "pro";
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/approve-upgrade", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ requestId, userId, plan: normalizedPlan, action: "approve" }),
      });

      if (res.ok) {
        setUpgradeRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r))
        );
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, subscription_tier: normalizedPlan } : p))
        );
        setStats((prev) => {
          const proCount = prev.proSubscribers + (normalizedPlan === "pro" ? 1 : 0);
          const premiumCount = prev.premiumSubscribers + (normalizedPlan === "premium" ? 1 : 0);
          return {
            ...prev,
            pendingUpgrades: Math.max(0, prev.pendingUpgrades - 1),
            proSubscribers: proCount,
            premiumSubscribers: premiumCount,
            estimatedMRR: proCount * 49 + premiumCount * 149,
          };
        });
        showNotification(`Plan upgraded to ${normalizedPlan.toUpperCase()}! 💳`);
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

  const toggleScamStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const nextScam = !currentStatus;
      const updates: any = {
        is_scam: nextScam,
      };
      if (nextScam) {
        updates.trust_score = 0;
        updates.is_verified = false;
        updates.kyc_status = "rejected";
      } else {
        updates.trust_score = 85;
      }
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, ...updates } : p))
        );
        showNotification(
          nextScam
            ? "⚠️ User flagged as SCAM / FRAUD ALERT across platform!"
            : "Scam warning removed from user profile."
        );
      } else {
        showNotification(data.error || "Failed to update scam status");
      }
    } catch (err) {
      console.error("Scam toggle failed:", err);
      showNotification("Network error executing scam toggle");
    }
  };

  const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const nextBan = !currentStatus;
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, updates: { is_banned: nextBan } }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, is_banned: nextBan } : p))
        );
        showNotification(
          nextBan
            ? "🚫 User account SUSPENDED / BANNED from platform."
            : "User account unsuspended."
        );
      } else {
        showNotification(data.error || "Failed to update suspension status");
      }
    } catch (err) {
      console.error("Ban toggle failed:", err);
      showNotification("Network error executing suspension toggle");
    }
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user "${name}" and all their projects, jobs, posts, and data? This action CANNOT be undone.`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== userId));
        setStats((prev) => ({
          ...prev,
          totalUsers: Math.max(0, prev.totalUsers - 1),
        }));
        showNotification(`User "${name}" has been permanently deleted.`);
      } else {
        const errJson = await res.json();
        showNotification(errJson.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("User deletion error:", err);
    }
  };

  const openEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name || "",
      username: user.username || "",
      role: user.role || "investor",
      country: user.country || "",
      subscription_tier: user.subscription_tier || "free",
      trust_score: user.trust_score ?? 85,
      is_verified: !!user.is_verified,
      is_scam: !!user.is_scam,
      is_banned: !!user.is_banned,
      bio: user.bio || "",
    });
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          updates: editFormData,
        }),
      });
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === editingUser.id ? { ...p, ...editFormData } : p))
        );
        showNotification(`User "${editFormData.full_name || editingUser.full_name}" updated! ✓`);
        setEditingUser(null);
      } else {
        const errJson = await res.json();
        showNotification(errJson.error || "Failed to save updates");
      }
    } catch (err) {
      console.error("User edit save error:", err);
    } finally {
      setSavingEdit(false);
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

  // Filtered lists based on search & category
  const filteredUsers = useMemo(() => {
    let result = profiles;
    if (userFilter === "investor") result = result.filter(p => p.role === "investor");
    else if (userFilter === "builder") result = result.filter(p => p.role === "builder");
    else if (userFilter === "talent") result = result.filter(p => p.role === "talent");
    else if (userFilter === "admin") result = result.filter(p => p.role === "admin");
    else if (userFilter === "scam") result = result.filter(p => !!p.is_scam);
    else if (userFilter === "banned") result = result.filter(p => !!p.is_banned);
    else if (userFilter === "verified") result = result.filter(p => !!p.is_verified);
    else if (userFilter === "pro") result = result.filter(p => (p.subscription_tier || "").toLowerCase() === "pro" || (p.subscription_tier || "").toLowerCase() === "premium");

    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q) ||
        (p.bio && p.bio.toLowerCase().includes(q))
    );
  }, [profiles, searchQuery, userFilter]);

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
    { id: "kyc", label: "KYC Queue ⚡", badge: stats.pendingKYC, icon: ShieldCheck },
    { id: "upgrades", label: "Subscriptions", badge: stats.pendingUpgrades, icon: CreditCard },
    { id: "users", label: `Users (${profiles.length})`, icon: Users },
    { id: "projects", label: `Projects (${projects.length})`, icon: TrendingUp },
    { id: "deals", label: `Deals (${deals.length})`, icon: DollarSign },
    { id: "invoices", label: `Invoices (${invoices.length})`, icon: Receipt },
    { id: "messages", label: `Flagged Messages`, badge: flaggedMessages.filter((m: any) => m.status === "pending").length, icon: AlertCircle },
    { id: "community", label: `Community (${communityPosts.length})`, icon: MessageSquare },
    { id: "referrals", label: `Referral Network`, icon: Share2 },
    { id: "waitlist", label: `Waitlist Leads (${waitlistEntries.length})`, badge: waitlistEntries.filter((w) => w.status === "pending").length, icon: UserCheck },
    { id: "broadcast", label: "Broadcast Center", icon: Megaphone },
    { id: "audit", label: "Audit Vault 🕵️", icon: ShieldAlert },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-[#F5F3ED] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-[#C9A84C]" />
        <p className="text-xs text-[#A8A6B8] font-medium">Authenticating REACH Admin Session…</p>
      </div>
    );
  }

  if (isAdminAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-[#F5F3ED] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A1A2E] border border-[#C9A84C]/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#C9A84C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center space-y-2">
            <div className="relative w-14 h-14 rounded-2xl bg-[#1A1A2E] border border-[#C9A84C]/40 flex items-center justify-center mx-auto shadow-lg shadow-[#C9A84C]/20 overflow-hidden">
              <Image
                src="/logo-icon.png"
                alt="REACH Logo"
                width={56}
                height={56}
                className="w-full h-full object-contain p-2"
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F5F3ED] tracking-tight pt-2">
              REACH Admin Portal
            </h1>
            <p className="text-xs text-[#A8A6B8]">
              High-Security Administrative Command Center
            </p>
          </div>

          {adminLoginError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-red-400" />
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div>
              <label className="text-[#A8A6B8] text-xs font-medium mb-1.5 block">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminLoginForm.email}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, email: e.target.value })}
                placeholder="admin@reachinvestment.com"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs font-medium mb-1.5 block">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminLoginForm.password}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
            </div>

            <button
              type="submit"
              disabled={adminLoginLoading}
              className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#C9A84C]/20 transition disabled:opacity-50 cursor-pointer"
            >
              {adminLoginLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Authenticate Admin Session</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => router.push("/auth/login")}
              className="text-xs text-[#5C5A70] hover:text-[#A8A6B8] transition cursor-pointer"
            >
              Return to Standard Platform Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-[#1A1A2E] border border-[#3A3A52]">
              <Image
                src="/logo-icon.png"
                alt="REACH Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain p-0.5"
                priority
              />
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
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#3A3A52] bg-[#1A1A2E] text-[#A8A6B8] hover:text-white hover:border-[#5C5A70] transition cursor-pointer"
          >
            <span>Exit Admin</span>
            <ExternalLink size={12} />
          </button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
          >
            <Lock size={12} />
            <span>Sign Out</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
              </div>
            )}

            {/* 2. KYC & IDENTITY REVIEW TAB */}
            {activeTab === "kyc" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <ShieldCheck size={20} className="text-[#C9A84C]" />
                      <span>Real-Time KYC & Identity Document Inspection</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Inspect uploaded Front ID, Back ID, Selfie, and Business Cert photos before approving</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
                    {stats.pendingKYC} Pending Review
                  </span>
                </div>

                {profiles.filter((p) => p.kyc_status === "pending").length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center space-y-2">
                    <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                    <h3 className="text-sm font-bold text-[#F5F3ED]">All caught up!</h3>
                    <p className="text-xs text-[#5C5A70]">There are no pending KYC applications at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {profiles
                      .filter((p) => p.kyc_status === "pending")
                      .map((user: any) => (
                        <div key={user.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 space-y-4 shadow-xl">
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
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0F0F1A] text-[#C9A84C] border border-[#3A3A52] uppercase font-bold">
                              {user.role}
                            </span>
                          </div>

                          {/* Submitted Specs */}
                          <div className="p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs space-y-1.5">
                            <div className="flex justify-between text-[#A8A6B8]">
                              <span>Document Type:</span>
                              <span className="font-bold text-[#F5F3ED] capitalize">{user.kyc_id_type?.replace("_", " ") || "Passport/ID"}</span>
                            </div>
                            <div className="flex justify-between text-[#A8A6B8]">
                              <span>Photos Submitted:</span>
                              <span className="text-emerald-400 font-bold">
                                {[user.kyc_front_url, user.kyc_back_url, user.kyc_selfie_url, user.kyc_business_cert_url].filter(Boolean).length} Uploaded Images
                              </span>
                            </div>
                          </div>

                          {/* Document Photo Inspector Trigger */}
                          <button
                            type="button"
                            onClick={() => setRejectingKycUser(user)}
                            className="w-full py-2.5 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-bold text-[#C9A84C] flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Eye size={16} />
                            <span>Inspect Uploaded ID Photos & Action</span>
                          </button>
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
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#C9A84C]" />
                      <span>Platform User Directory & Moderation</span>
                    </h2>
                    <p className="text-xs text-[#5C5A70]">Full control: Edit any profile, flag scam accounts, ban/suspend users, adjust trust scores, and delete accounts.</p>
                  </div>
                  <button
                    onClick={exportUsersCSV}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition shadow-md"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Filter Chips Bar */}
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-none] pb-1">
                  {[
                    { id: "all", label: `All Users (${profiles.length})` },
                    { id: "investor", label: `Investors (${profiles.filter(p => p.role === 'investor').length})` },
                    { id: "builder", label: `Builders (${profiles.filter(p => p.role === 'builder').length})` },
                    { id: "talent", label: `Talent (${profiles.filter(p => p.role === 'talent').length})` },
                    { id: "scam", label: `⚠️ Scam Flagged (${profiles.filter(p => !!p.is_scam).length})`, color: "border-red-500/40 text-red-400" },
                    { id: "banned", label: `🚫 Suspended (${profiles.filter(p => !!p.is_banned).length})`, color: "border-zinc-500/40 text-zinc-400" },
                    { id: "verified", label: `Verified (${profiles.filter(p => !!p.is_verified).length})` },
                    { id: "pro", label: `Pro/Premium (${profiles.filter(p => (p.subscription_tier || '').toLowerCase() === 'pro' || (p.subscription_tier || '').toLowerCase() === 'premium').length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setUserFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                        userFilter === f.id
                          ? "bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C]"
                          : f.color 
                          ? `bg-[#1A1A2E] ${f.color} hover:bg-[#2A2A3E]`
                          : "bg-[#1A1A2E] border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#2A2A3E]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#A8A6B8]">
                      <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[11px] uppercase font-bold text-[#5C5A70]">
                        <tr>
                          <th className="px-5 py-3.5">User Identity</th>
                          <th className="px-5 py-3.5">Role</th>
                          <th className="px-5 py-3.5">Country & Trust</th>
                          <th className="px-5 py-3.5">Plan Tier</th>
                          <th className="px-5 py-3.5">Moderation & Safety</th>
                          <th className="px-5 py-3.5 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A3A52]/50">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-[#5C5A70]">
                              No users match the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className={`hover:bg-[#2A2A3E]/30 transition ${user.is_scam ? 'bg-red-950/40 border-l-4 border-red-500' : user.is_banned ? 'bg-zinc-900/60 border-l-4 border-zinc-500 opacity-60' : ''}`}>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs font-bold text-[#C9A84C]">
                                        {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-[#F5F3ED]">{user.full_name}</span>
                                      {user.is_scam && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                                          ⚠️ SCAM / FRAUD ALERT
                                        </span>
                                      )}
                                      {user.is_banned && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-600">
                                          🚫 BANNED
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-[#5C5A70]">@{user.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <select
                                  value={user.role || "investor"}
                                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                                  className="bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#A8A6B8] rounded-lg px-2 py-1 outline-none capitalize focus:border-[#C9A84C]"
                                >
                                  <option value="investor">Investor</option>
                                  <option value="builder">Builder</option>
                                  <option value="talent">Talent</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="font-medium text-[#F5F3ED]">{user.country || "—"}</div>
                                {user.is_scam ? (
                                  <div className="text-[10px] text-red-400 font-extrabold flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Score: 0 (FRAUD ALERT)</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[#C9A84C] flex items-center gap-0.5 font-medium">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    <span>Score: {user.trust_score ?? 85}</span>
                                  </div>
                                )}
                              </td>
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Scam Flag Button */}
                                  <button
                                    onClick={() => toggleScamStatus(user.id, !!user.is_scam)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                      user.is_scam
                                        ? "bg-red-600 text-white border-red-500 shadow-sm"
                                        : "bg-[#0F0F1A] border-[#3A3A52] text-[#5C5A70] hover:text-red-400 hover:border-red-500/40"
                                    }`}
                                    title={user.is_scam ? "Remove Scam Flag" : "Flag as Scam / Fraud"}
                                  >
                                    {user.is_scam ? "⚠️ Flagged Scam" : "Flag Scam"}
                                  </button>

                                  {/* Ban / Suspend Button */}
                                  <button
                                    onClick={() => toggleBanStatus(user.id, !!user.is_banned)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                      user.is_banned
                                        ? "bg-zinc-800 text-zinc-300 border-zinc-600 shadow-sm"
                                        : "bg-[#0F0F1A] border-[#3A3A52] text-[#5C5A70] hover:text-yellow-400 hover:border-yellow-500/40"
                                    }`}
                                    title={user.is_banned ? "Unsuspend User" : "Suspend / Ban User Account"}
                                  >
                                    {user.is_banned ? "🚫 Suspended" : "Suspend"}
                                  </button>

                                  {/* KYC Verified Button */}
                                  <button
                                    onClick={() => toggleUserVerified(user.id, user.is_verified)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                      user.is_verified
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                        : "bg-[#0F0F1A] border-[#3A3A52] text-[#5C5A70]"
                                    }`}
                                    title="Toggle Verification"
                                  >
                                    {user.is_verified ? "Verified ✓" : "Unverified"}
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditUser(user)}
                                    className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition"
                                    title="Edit Full Profile"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={() => deleteUser(user.id, user.full_name)}
                                    className="p-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 transition"
                                    title="Permanently Delete User"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ADVANCED PROJECT MODERATION TAB */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <TrendingUp size={20} className="text-[#C9A84C]" />
                      <span>Advanced Project Moderation & Listing Controls</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Absolute oversight over startup pitch decks, listing tiers, fraud flags, and feed placement</p>
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center text-xs text-[#5C5A70]">
                    No projects found matching criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredProjects.map((proj: any) => (
                      <div key={proj.id} className={`bg-[#1A1A2E] border rounded-2xl p-5 shadow-xl space-y-4 transition ${proj.is_fraudulent ? 'border-red-500/50 bg-red-950/10' : 'border-[#3A3A52]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-[#F5F3ED]">{proj.title}</h3>
                              {proj.is_pinned && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] font-bold flex items-center gap-1">
                                  <Pin size={10} /> Pinned
                                </span>
                              )}
                              {proj.is_fraudulent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold flex items-center gap-1">
                                  <AlertTriangle size={10} /> Flagged Fraud
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#5C5A70] mt-0.5">
                              Founder: <span className="text-[#A8A6B8] font-semibold">{proj.profiles?.full_name || "Founder"}</span> (@{proj.profiles?.username || "user"})
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase ${
                              proj.is_published !== false ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#0F0F1A] border-[#3A3A52] text-[#5C5A70]"
                            }`}>
                              {proj.is_published !== false ? "Published" : "Draft/Hidden"}
                            </span>
                          </div>
                        </div>

                        {/* Pitch Snippet */}
                        <p className="text-xs text-[#A8A6B8] line-clamp-2 leading-relaxed">{proj.pitch || proj.description}</p>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[11px]">
                          <div>
                            <span className="text-[#5C5A70] block text-[9px] uppercase">Goal</span>
                            <span className="font-mono font-bold text-emerald-400">${Number(proj.funding_goal || proj.target_amount || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#5C5A70] block text-[9px] uppercase">Sector & Stage</span>
                            <span className="font-semibold text-[#F5F3ED]">{proj.sector || "Tech"} · {proj.stage || "MVP"}</span>
                          </div>
                          <div>
                            <span className="text-[#5C5A70] block text-[9px] uppercase">Category</span>
                            <span className="font-bold text-[#C9A84C] uppercase">{proj.category || "web3"}</span>
                          </div>
                          <div>
                            <span className="text-[#5C5A70] block text-[9px] uppercase">Views / Saved</span>
                            <span className="font-mono text-[#A8A6B8]">{proj.views_count || 0} 👁️ / {proj.bookmarks_count || 0} 🔖</span>
                          </div>
                        </div>

                        {/* Admin Action Control Bar */}
                        <div className="flex items-center justify-between border-t border-[#3A3A52]/60 pt-3 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-[#5C5A70]">Tier:</label>
                            <select
                              value={proj.tier || "free"}
                              onChange={async (e) => {
                                const newTier = e.target.value;
                                const { data: { session } } = await supabase.auth.getSession();
                                await fetch("/api/admin/projects", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                  body: JSON.stringify({ projectId: proj.id, updates: { tier: newTier } })
                                });
                                showNotification(`Updated project tier to ${newTier.toUpperCase()}! 🌟`);
                                void fetchAdminData();
                              }}
                              className="bg-[#0F0F1A] border border-[#3A3A52] text-[10px] font-bold text-[#C9A84C] rounded-lg px-2 py-1 outline-none focus:border-[#C9A84C]"
                            >
                              <option value="free">Free Tier</option>
                              <option value="pro">Pro Listing</option>
                              <option value="premium">Premium ⭐</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={async () => {
                                const { data: { session } } = await supabase.auth.getSession();
                                await fetch("/api/admin/projects", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                  body: JSON.stringify({ projectId: proj.id, updates: { is_pinned: !proj.is_pinned } })
                                });
                                showNotification(proj.is_pinned ? "Unpinned project" : "Pinned project to top! 📌");
                                void fetchAdminData();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                proj.is_pinned ? "bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C]" : "bg-[#0F0F1A] text-[#A8A6B8] border-[#3A3A52] hover:text-white"
                              }`}
                            >
                              {proj.is_pinned ? "Pinned 📌" : "Pin Feed"}
                            </button>

                            <button
                              onClick={async () => {
                                const { data: { session } } = await supabase.auth.getSession();
                                await fetch("/api/admin/projects", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                  body: JSON.stringify({ projectId: proj.id, updates: { is_fraudulent: !proj.is_fraudulent } })
                                });
                                showNotification(proj.is_fraudulent ? "Cleared fraud status" : "Flagged project as FRAUDULENT! ⚠️");
                                void fetchAdminData();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                proj.is_fraudulent ? "bg-red-600 text-white border-red-500" : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                              }`}
                            >
                              {proj.is_fraudulent ? "Fraud Flagged ⚠️" : "Flag Fraud"}
                            </button>

                            <button
                              onClick={async () => {
                                const { data: { session } } = await supabase.auth.getSession();
                                await fetch("/api/admin/projects", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                  body: JSON.stringify({ projectId: proj.id, updates: { is_published: proj.is_published === false ? true : false } })
                                });
                                showNotification(proj.is_published === false ? "Project Published!" : "Project Unpublished");
                                void fetchAdminData();
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white transition cursor-pointer"
                            >
                              {proj.is_published === false ? "Publish" : "Unpublish"}
                            </button>

                            <button
                              onClick={() => deleteProject(proj.id)}
                              className="p-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
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

            {/* 5. DEAL MONITORING & COMMISSION TAB */}
            {activeTab === "deals" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <DollarSign size={20} className="text-[#C9A84C]" />
                      <span>Deal Monitoring & Pipeline Control</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Real-time visibility into active investment deals, stages, and 3% platform commission dues</p>
                  </div>

                  <button
                    onClick={() => {
                      const csv = "data:text/csv;charset=utf-8," + ["Investor,Project,Deal Size,Stage,Commission Due,Commission Status,Date"].join(",") + "\n" + deals.map(d => [d.investor?.full_name || 'N/A', d.project?.title || 'N/A', d.amount || 0, d.stage || 'N/A', d.commission_amount || 0, d.commission_status || 'pending', d.created_at || ''].join(",")).join("\n");
                      const link = document.createElement("a");
                      link.setAttribute("href", encodeURI(csv));
                      link.setAttribute("download", `deals_export_${new Date().toISOString().split("T")[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-semibold text-[#A8A6B8] hover:text-white transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                  {deals.length === 0 ? (
                    <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                      <DollarSign size={24} className="mx-auto text-[#3A3A52]" />
                      <p>No active investment deals recorded in pipeline yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[#A8A6B8] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Investor</th>
                            <th className="py-3 px-4">Target Project</th>
                            <th className="py-3 px-4">Deal Size</th>
                            <th className="py-3 px-4">Pipeline Stage</th>
                            <th className="py-3 px-4">3% Commission</th>
                            <th className="py-3 px-4">Payment Status</th>
                            <th className="py-3 px-4 text-right">Admin Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3A3A52]/60 text-[#F5F3ED]">
                          {deals.map((deal: any) => (
                            <tr key={deal.id} className="hover:bg-[#2A2A3E]/40 transition">
                              <td className="py-3.5 px-4 font-semibold">
                                {deal.investor?.full_name || "Investor"}
                                {deal.investor?.username && <div className="text-[10px] text-[#5C5A70]">@{deal.investor.username}</div>}
                              </td>
                              <td className="py-3.5 px-4 text-[#C9A84C] font-medium">
                                {deal.project?.title || "Project"}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                                ${Number(deal.amount || 0).toLocaleString()} {deal.currency || "USD"}
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={deal.stage || "nda"}
                                  onChange={async (e) => {
                                    const newStage = e.target.value;
                                    const { data: { session } } = await supabase.auth.getSession();
                                    await fetch("/api/admin/deals", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                      body: JSON.stringify({ dealId: deal.id, action: "update_stage", stage: newStage })
                                    });
                                    showNotification(`Advanced deal stage to ${newStage.toUpperCase()}! 🚀`);
                                    void fetchAdminData();
                                  }}
                                  className="bg-[#0F0F1A] border border-[#3A3A52] text-[10px] font-bold text-[#F5F3ED] rounded-lg px-2 py-1 outline-none focus:border-[#C9A84C] cursor-pointer"
                                >
                                  <option value="nda">1. NDA Signed 📑</option>
                                  <option value="term_sheet">2. Term Sheet 📜</option>
                                  <option value="agreement">3. Agreement 📝</option>
                                  <option value="closed">4. Closed Deal 🎉</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#F5F3ED]">
                                ${Number(deal.commission_amount || (deal.amount * 0.03)).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                  deal.commission_status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                }`}>
                                  {deal.commission_status || "pending"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={async () => {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    await fetch("/api/admin/deals", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                      body: JSON.stringify({ dealId: deal.id, action: "update_commission", commissionStatus: "paid" })
                                    });
                                    showNotification("Marked commission as PAID! 💳");
                                    void fetchAdminData();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold transition cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. COMMISSION INVOICES TAB */}
            {activeTab === "invoices" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <Receipt size={20} className="text-[#C9A84C]" />
                      <span>Commission Invoice Management Vault</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Manage closed deal invoices, track overdue balances, send reminders, and waive fees</p>
                  </div>

                  <button
                    onClick={() => {
                      const csv = "data:text/csv;charset=utf-8," + ["Investor,Project,Deal Amount,Commission,Status,Due Date"].join(",") + "\n" + invoices.map(i => [i.investor?.full_name || 'N/A', i.project?.title || 'N/A', i.deal_amount || 0, i.commission_amount || 0, i.status || 'pending', i.due_date || ''].join(",")).join("\n");
                      const link = document.createElement("a");
                      link.setAttribute("href", encodeURI(csv));
                      link.setAttribute("download", `invoices_export_${new Date().toISOString().split("T")[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-semibold text-[#A8A6B8] hover:text-white transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Export Invoices CSV</span>
                  </button>
                </div>

                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                  {invoices.length === 0 ? (
                    <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                      <Receipt size={24} className="mx-auto text-[#3A3A52]" />
                      <p>No commission invoices recorded.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[#A8A6B8] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Invoice ID</th>
                            <th className="py-3 px-4">Investor</th>
                            <th className="py-3 px-4">Deal Amount</th>
                            <th className="py-3 px-4">Commission Due</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3A3A52]/60 text-[#F5F3ED]">
                          {invoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-[#2A2A3E]/40 transition">
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[#A8A6B8]">
                                #{inv.id.slice(0, 8)}
                              </td>
                              <td className="py-3.5 px-4 font-semibold">
                                {inv.investor?.full_name || "Investor"}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                                ${Number(inv.deal_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#C9A84C]">
                                ${Number(inv.commission_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                  inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : inv.status === "waived" ? "bg-purple-500/10 text-purple-400 border border-purple-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                }`}>
                                  {inv.status || "pending"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={async () => {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    await fetch("/api/admin/invoices", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                      body: JSON.stringify({ invoiceId: inv.id, action: "send_reminder", investorId: inv.investor_id })
                                    });
                                    showNotification("Payment reminder sent to investor! 📩");
                                  }}
                                  className="px-2 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[10px] font-semibold transition cursor-pointer"
                                >
                                  Remind
                                </button>
                                <button
                                  onClick={async () => {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    await fetch("/api/admin/invoices", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                      body: JSON.stringify({ invoiceId: inv.id, action: "update_status", status: "paid" })
                                    });
                                    showNotification("Invoice marked as PAID! 💳");
                                    void fetchAdminData();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold transition cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. MESSAGE MONITORING & MODERATION CENTER */}
            {activeTab === "messages" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <AlertCircle size={20} className="text-[#C9A84C]" />
                      <span>Direct Messages & Communication Moderation</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Audit flagged messages, inspect platform conversation threads read-only, issue warnings, and enforce safety</p>
                  </div>

                  {/* Sub-tab Toggle */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0F0F1A] border border-[#3A3A52]">
                    <button
                      onClick={() => setMsgSubTab("flagged")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        msgSubTab === "flagged" ? "bg-[#C9A84C] text-[#0A0A0F]" : "text-[#A8A6B8] hover:text-white"
                      }`}
                    >
                      🚩 Flagged Queue ({flaggedMessages.length})
                    </button>
                    <button
                      onClick={() => setMsgSubTab("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        msgSubTab === "all" ? "bg-[#C9A84C] text-[#0A0A0F]" : "text-[#A8A6B8] hover:text-white"
                      }`}
                    >
                      💬 All Conversations ({conversations.length})
                    </button>
                  </div>
                </div>

                {/* Sub-Tab 1: Flagged Queue */}
                {msgSubTab === "flagged" && (
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                    {flaggedMessages.length === 0 ? (
                      <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                        <ShieldCheck size={28} className="mx-auto text-emerald-500/40" />
                        <p className="text-sm font-semibold text-[#F5F3ED]">No Flagged Messages Pending</p>
                        <p>No direct messages have triggered moderation warnings or user reports.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#3A3A52]/60">
                        {flaggedMessages.map((flag: any) => (
                          <div key={flag.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#2A2A3E]/40 transition">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#C9A84C]">Flag Reason: {flag.reason}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold">
                                  {flag.status || "pending"}
                                </span>
                              </div>
                              <p className="text-xs text-[#F5F3ED] font-mono bg-[#0F0F1A] border border-[#3A3A52] rounded-xl p-3 max-w-2xl">
                                "{flag.message?.content || 'Message content unavailable'}"
                              </p>
                              <div className="text-[11px] text-[#5C5A70]">
                                Sender: <span className="text-[#A8A6B8] font-semibold">{flag.message?.sender?.full_name || 'User'}</span> · Reported by: <span className="text-[#A8A6B8]">{flag.reporter?.full_name || 'System'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={async () => {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  await fetch("/api/admin/messages", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                    body: JSON.stringify({ flagId: flag.id, targetUserId: flag.message?.sender?.id, action: "warn_user", warningReason: flag.reason })
                                  });
                                  showNotification("Official moderation warning issued to sender! ⚠️");
                                  void fetchAdminData();
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                              >
                                Warn User
                              </button>
                              <button
                                onClick={async () => {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  await fetch("/api/admin/messages", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                    body: JSON.stringify({ flagId: flag.id, messageId: flag.message_id, action: "delete_message" })
                                  });
                                  showNotification("Flagged message deleted! 🗑️");
                                  void fetchAdminData();
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-semibold transition cursor-pointer"
                              >
                                Delete Message
                              </button>
                              <button
                                onClick={async () => {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  await fetch("/api/admin/messages", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                    body: JSON.stringify({ flagId: flag.id, action: "dismiss_flag" })
                                  });
                                  showNotification("Flag dismissed.");
                                  void fetchAdminData();
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white text-xs font-semibold transition cursor-pointer"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Tab 2: All Conversations Read-Only Thread Viewer */}
                {msgSubTab === "all" && (
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                    {conversations.length === 0 ? (
                      <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                        <MessageSquare size={28} className="mx-auto text-[#3A3A52]" />
                        <p className="text-sm font-semibold text-[#F5F3ED]">No Active Conversations</p>
                        <p>No direct message threads exist between users yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#3A3A52]/60">
                        {conversations.map((conv: any) => {
                          const p1 = conv.participant1 || { full_name: "User 1" };
                          const p2 = conv.participant2 || { full_name: "User 2" };
                          const msgCount = (conv.messages || []).length;
                          const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

                          return (
                            <div key={conv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#2A2A3E]/40 transition">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#F5F3ED]">
                                    {p1.full_name} <span className="text-[#5C5A70] text-xs font-normal">(@{p1.username || 'user'})</span>
                                  </span>
                                  <span className="text-xs text-[#C9A84C] font-bold">⇄</span>
                                  <span className="text-sm font-bold text-[#F5F3ED]">
                                    {p2.full_name} <span className="text-[#5C5A70] text-xs font-normal">(@{p2.username || 'user'})</span>
                                  </span>
                                </div>

                                {lastMsg ? (
                                  <p className="text-xs text-[#A8A6B8] line-clamp-1 font-mono bg-[#0F0F1A] border border-[#3A3A52]/60 rounded-lg px-2.5 py-1.5 w-fit">
                                    "{lastMsg.content}"
                                  </p>
                                ) : (
                                  <p className="text-xs text-[#5C5A70]">No messages sent yet</p>
                                )}

                                <div className="text-[10px] text-[#5C5A70]">
                                  {msgCount} messages in thread · Last active: {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : 'Recent'}
                                </div>
                              </div>

                              <button
                                onClick={() => setInspectingConversation(conv)}
                                className="px-3.5 py-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-bold text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0A0A0F] transition cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                <Eye size={14} />
                                <span>Inspect Thread</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 8. REFERRAL NETWORK TAB */}
            {activeTab === "referrals" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <Share2 size={20} className="text-[#C9A84C]" />
                      <span>Referral Network & Leaderboard</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Track user referral trees, status progression, top referrers, and commission credits</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Top Referrers Leaderboard */}
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#C9A84C] flex items-center gap-2">
                      <Award size={16} />
                      <span>Top Referrers Leaderboard</span>
                    </h3>

                    {topReferrers.length === 0 ? (
                      <p className="text-xs text-[#5C5A70]">No referrers active yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {topReferrers.map((ref: any, idx: number) => (
                          <div key={ref.id} className="p-3 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#C9A84C]/15 text-[#C9A84C] font-bold text-[10px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <span className="font-bold text-[#F5F3ED]">{ref.full_name}</span>
                            </div>
                            <span className="font-mono text-[#C9A84C] font-bold">{ref.referral_count || 0} Invites</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Referral Relationships Table */}
                  <div className="lg:col-span-2 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                    {referrals.length === 0 ? (
                      <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                        <Share2 size={24} className="mx-auto text-[#3A3A52]" />
                        <p>No referral links generated yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[#A8A6B8] uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-3 px-4">Referrer</th>
                              <th className="py-3 px-4">Referred User</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#3A3A52]/60 text-[#F5F3ED]">
                            {referrals.map((r: any) => (
                              <tr key={r.id} className="hover:bg-[#2A2A3E]/40 transition">
                                <td className="py-3 px-4 font-semibold">{r.referrer?.full_name || 'Referrer'}</td>
                                <td className="py-3 px-4 text-[#A8A6B8]">{r.referred?.full_name || 'Referred'}</td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {r.status || 'signed_up'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={async () => {
                                      const { data: { session } } = await supabase.auth.getSession();
                                      await fetch("/api/admin/referrals", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                        body: JSON.stringify({ referralId: r.id, action: "update_status", status: "rewarded" })
                                      });
                                      showNotification("Triggered referral reward! 🎁");
                                      void fetchAdminData();
                                    }}
                                    className="px-2 py-1 rounded-lg bg-[#C9A84C] text-[#0A0A0F] font-bold text-[10px] cursor-pointer"
                                  >
                                    Trigger Reward
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 9. BROADCAST CENTER TAB */}
            {activeTab === "broadcast" && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 shadow-xl space-y-5">
                  <div className="border-b border-[#3A3A52] pb-4">
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <Megaphone size={20} className="text-[#C9A84C]" />
                      <span>Platform Broadcast & Announcement Dispatcher</span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">Send instant platform-wide announcements or targeted push notifications to specific user roles</p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSendingBroadcast(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch("/api/admin/broadcast", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                          body: JSON.stringify(broadcastForm),
                        });
                        const json = await res.json();
                        if (res.ok) {
                          showNotification(`Dispatched announcement to ${json.count || 0} users! 📢`);
                          setBroadcastForm({ target: "all", userId: "", title: "", body: "", actionUrl: "" });
                        } else {
                          showNotification(`Error: ${json.error}`);
                        }
                      } catch {
                        showNotification("Broadcast dispatch failed");
                      } finally {
                        setSendingBroadcast(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    {/* Curated Deal Digest Quick Template */}
                    <div className="p-3.5 rounded-xl bg-[#0F0F1A] border border-[#C9A84C]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div>
                        <span className="text-xs font-bold text-[#C9A84C] flex items-center gap-1.5">
                          <Sparkles size={13} />
                          <span>Weekly Curated Investor Deal Digest</span>
                        </span>
                        <p className="text-[11px] text-[#8E8CA0] mt-0.5">
                          Auto-fills an executive teaser of verified startups raising capital for registered investors.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const topProjects = projects.slice(0, 3);
                          const projectSummaries = topProjects.length > 0
                            ? topProjects.map((p: any, idx: number) => `${idx + 1}. ${p.name} (${p.category || "Tech"}) — Target Raise: $${(p.funding_goal || 100000).toLocaleString()} USD`).join("\n")
                            : "1. Verified Emerging Market Fintech — Raising $250k Seed\n2. AI Infrastructure Platform — Raising $500k\n3. Cross-Border Logistics SaaS — Raising $150k";

                          setBroadcastForm({
                            target: "investors",
                            userId: "",
                            title: "Curated Deal Digest: Top Vetted Startups Raising on REACH 🚀",
                            body: `Exclusive deal flow digest for accredited investors:\n\n${projectSummaries}\n\nReview data rooms, watermarked decks, and schedule direct calls with founders now.`,
                            actionUrl: "/dashboard/investor",
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/40 text-[#C9A84C] font-bold text-xs hover:bg-[#C9A84C]/25 transition shrink-0 cursor-pointer"
                      >
                        Load Deal Digest Template
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Target Audience</label>
                      <select
                        value={broadcastForm.target}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                        className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition"
                      >
                        <option value="all">🌍 All Registered Platform Users</option>
                        <option value="investors">💼 Investors Only</option>
                        <option value="builders">🛠️ Builders / Founders Only</option>
                        <option value="user">🎯 Specific User ID</option>
                      </select>
                    </div>

                    {broadcastForm.target === "user" && (
                      <div>
                        <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Target User ID (UUID)</label>
                        <input
                          type="text"
                          required
                          value={broadcastForm.userId}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, userId: e.target.value })}
                          placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                          className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Notification Title</label>
                      <input
                        type="text"
                        required
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        placeholder="e.g. Platform Upgrade & New Features Live!"
                        className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Message Body</label>
                      <textarea
                        required
                        rows={4}
                        value={broadcastForm.body}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                        placeholder="Write detailed announcement content here..."
                        className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl p-4 outline-none focus:border-[#C9A84C] transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#A8A6B8] mb-1.5 block">Action URL (Optional)</label>
                      <input
                        type="text"
                        value={broadcastForm.actionUrl}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, actionUrl: e.target.value })}
                        placeholder="e.g. /dashboard/community"
                        className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingBroadcast}
                      className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingBroadcast ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Dispatch Broadcast</>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* PRE-LAUNCH WAITLIST LEADS TAB */}
            {activeTab === "waitlist" && (
              <div className="space-y-6">
                {/* Header & Stats Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <UserCheck size={20} className="text-[#C9A84C]" />
                      <span>Pre-Launch Waitlist & Lead Pipeline</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] font-bold">
                        {waitlistEntries.length} Total Applicants
                      </span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">
                      Review, manage, and approve early-access applicants across Investors, Founders, and Talent.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8," + [
                          ["Name", "Email", "Role", "Country", "Ticket Size", "Startup", "Target Raise", "Referral Code", "Status", "Date"].join(","),
                          ...waitlistEntries.map(w => [
                            `"${w.full_name || ""}"`,
                            `"${w.email || ""}"`,
                            `"${w.role || ""}"`,
                            `"${w.country || ""}"`,
                            `"${w.ticket_size || ""}"`,
                            `"${w.startup_name || ""}"`,
                            `"${w.target_raise || ""}"`,
                            `"${w.referral_code || ""}"`,
                            `"${w.status || "pending"}"`,
                            `"${w.created_at || ""}"`,
                          ].join(","))
                        ].join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `reach_waitlist_leads_${new Date().toISOString().slice(0, 10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-semibold text-[#A8A6B8] hover:text-white hover:border-[#C9A84C] transition cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total Leads", count: waitlistEntries.length, color: "text-[#C9A84C]", bg: "bg-[#C9A84C]/10" },
                    { label: "Investors in Queue", count: waitlistEntries.filter(w => w.role === "investor").length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Founders in Queue", count: waitlistEntries.filter(w => w.role === "builder").length, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Talent in Queue", count: waitlistEntries.filter(w => w.role === "talent").length, color: "text-purple-400", bg: "bg-purple-500/10" },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-1">
                      <span className="text-[11px] text-[#8E8CA0] uppercase tracking-wider font-semibold block">{stat.label}</span>
                      <span className={`text-2xl font-black ${stat.color}`}>{stat.count}</span>
                    </div>
                  ))}
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {["all", "investor", "builder", "talent"].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setWaitlistFilter(f)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer capitalize ${
                          waitlistFilter === f
                            ? "bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C]"
                            : "bg-[#0F0F1A] border-[#3A3A52] text-[#8E8CA0] hover:text-[#F5F3ED]"
                        }`}
                      >
                        {f === "all" ? "All Applicants" : f === "builder" ? "Founders" : `${f}s`}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-[#8E8CA0] font-mono">
                    Showing {waitlistEntries.filter(w => waitlistFilter === "all" || w.role === waitlistFilter).length} leads
                  </span>
                </div>

                {/* Leads Table */}
                <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                  {waitlistEntries.length === 0 ? (
                    <div className="p-12 text-center space-y-2">
                      <UserCheck size={32} className="text-[#C9A84C] mx-auto opacity-50" />
                      <h3 className="text-sm font-bold text-[#F5F3ED]">No waitlist applications yet</h3>
                      <p className="text-xs text-[#8E8CA0]">
                        Applications submitted via /waitlist will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#3A3A52] bg-[#0F0F1A] text-[#8E8CA0] uppercase text-[10px] tracking-wider">
                            <th className="py-3.5 px-4 font-bold">Applicant</th>
                            <th className="py-3.5 px-4 font-bold">Role</th>
                            <th className="py-3.5 px-4 font-bold">Location</th>
                            <th className="py-3.5 px-4 font-bold">Profile Details</th>
                            <th className="py-3.5 px-4 font-bold">Referral</th>
                            <th className="py-3.5 px-4 font-bold">Status</th>
                            <th className="py-3.5 px-4 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3A3A52]/60">
                          {waitlistEntries
                            .filter(w => waitlistFilter === "all" || w.role === waitlistFilter)
                            .map((entry: any) => (
                              <tr key={entry.id} className="hover:bg-[#25253A]/50 transition">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-[#F5F3ED]">{entry.full_name}</div>
                                  <div className="text-[11px] text-[#8E8CA0] font-mono">{entry.email}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                    entry.role === "investor"
                                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                      : entry.role === "builder"
                                      ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                                      : "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                                  }`}>
                                    {entry.role === "builder" ? "Founder" : entry.role}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-[#A8A6B8]">
                                  {entry.country || "Global"}
                                </td>
                                <td className="py-3.5 px-4">
                                  {entry.role === "investor" && (
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-[#F5F3ED] block">Ticket: {entry.ticket_size || "Standard"}</span>
                                      {Array.isArray(entry.sectors) && entry.sectors.length > 0 && (
                                        <span className="text-[10px] text-[#C9A84C] block">{entry.sectors.join(", ")}</span>
                                      )}
                                    </div>
                                  )}
                                  {entry.role === "builder" && (
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-[#F5F3ED] block">{entry.startup_name || "Startup"}</span>
                                      <span className="text-[10px] text-[#8E8CA0] block">Target: {entry.target_raise || "Flexible"} · {entry.stage || "Early"}</span>
                                    </div>
                                  )}
                                  {entry.role === "talent" && (
                                    <div className="text-[#A8A6B8]">{entry.skills || "Tech Specialist"}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono text-[11px] text-[#C9A84C]">{entry.referral_code || "—"}</div>
                                  {entry.referred_by && (
                                    <div className="text-[10px] text-[#8E8CA0]">via: {entry.referred_by}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                                    entry.status === "approved" || entry.status === "invited"
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                                  }`}>
                                    {entry.status || "pending"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const origin = window.location.origin;
                                        const inviteUrl = `${origin}/onboarding?email=${encodeURIComponent(entry.email)}&role=${encodeURIComponent(entry.role || "investor")}`;
                                        navigator.clipboard.writeText(inviteUrl);
                                        showNotification(`Copied VIP Invite Link for ${entry.full_name}! 📋`);
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-[#141424] border border-[#3A3A52] hover:border-[#C9A84C] text-[11px] font-semibold text-[#A8A6B8] hover:text-white transition cursor-pointer flex items-center gap-1"
                                      title="Copy personalized direct signup link"
                                    >
                                      <Share2 size={12} />
                                      <span>Copy Link</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={updatingWaitlistId === entry.id}
                                      onClick={async () => {
                                        const newStatus = entry.status === "invited" ? "pending" : "invited";
                                        setUpdatingWaitlistId(entry.id);
                                        try {
                                          const res = await fetch("/api/admin/waitlist", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ entryId: entry.id, status: newStatus }),
                                          });
                                          if (res.ok) {
                                            setWaitlistEntries(prev => prev.map(item => item.id === entry.id ? { ...item, status: newStatus } : item));
                                            showNotification(`Lead marked as ${newStatus}!`);
                                          }
                                        } catch {
                                          showNotification("Status update failed");
                                        } finally {
                                          setUpdatingWaitlistId(null);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#0F0F1A] border border-[#3A3A52] hover:border-[#C9A84C] text-[11px] font-semibold text-[#F5F3ED] transition cursor-pointer"
                                    >
                                      {updatingWaitlistId === entry.id ? (
                                        <Loader2 size={12} className="animate-spin inline" />
                                      ) : entry.status === "invited" ? (
                                        "Reset to Pending"
                                      ) : (
                                        "Approve & Invite"
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 9. UNIVERSAL AUDIT & ACTIVITY VAULT TAB */}
            {activeTab === "audit" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F3ED] flex items-center gap-2">
                      <ShieldAlert size={20} className="text-[#C9A84C]" />
                      <span>Universal Platform Audit Vault</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                        PIN Protected
                      </span>
                    </h2>
                    <p className="text-xs text-[#A8A6B8] mt-0.5">
                      Real-time security telemetry and activity recording across all Admins and Platform Users
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowPasscodeModal(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-semibold text-[#A8A6B8] hover:text-white hover:border-[#C9A84C] transition cursor-pointer"
                    >
                      <KeyRound size={14} className="text-[#C9A84C]" />
                      <span>Change Access Code</span>
                    </button>
                  </div>
                </div>

                {!auditUnlocked ? (
                  /* PIN Pad Lock Overlay */
                  <div className="max-w-md mx-auto bg-[#1A1A2E] border border-[#C9A84C]/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl my-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto text-[#C9A84C]">
                      <Lock size={30} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#F5F3ED]">
                        Security Audit Passcode Required
                      </h3>
                      <p className="text-xs text-[#A8A6B8]">
                        Enter master security access code to unlock universal audit logs
                      </p>
                    </div>

                    {auditPasscodeError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                        {auditPasscodeError}
                      </div>
                    )}

                    <form onSubmit={handleVerifyPasscode} className="space-y-4">
                      <input
                        type="password"
                        maxLength={12}
                        value={auditPasscode}
                        onChange={(e) => setAuditPasscode(e.target.value)}
                        placeholder="Enter access code (Default: 779933)"
                        className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-center text-[#F5F3ED] text-lg tracking-widest font-mono rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                      />

                      <button
                        type="submit"
                        disabled={verifyingPasscode || !auditPasscode}
                        className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#0A0A0F] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#C9A84C]/20 transition disabled:opacity-50 cursor-pointer"
                      >
                        {verifyingPasscode ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <KeyRound size={16} />
                            <span>Unlock Audit Vault</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Unlocked Audit Log Table & Telemetry */
                  <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: "all", label: "All Telemetry" },
                          { id: "admin", label: "Admin Actions" },
                          { id: "user", label: "User Activity" },
                          { id: "security", label: "Security Alerts" },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setAuditFilter(f.id);
                              fetchAuditLogs(auditPasscode);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              auditFilter === f.id
                                ? "bg-[#C9A84C] text-[#0A0A0F] shadow-md shadow-[#C9A84C]/20"
                                : "bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-white"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5A70]" />
                        <input
                          type="text"
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && fetchAuditLogs(auditPasscode)}
                          placeholder="Search IP, User, Action..."
                          className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-xs text-[#F5F3ED] rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#C9A84C] transition"
                        />
                      </div>
                    </div>

                    {/* Logs Table */}
                    <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl overflow-hidden shadow-xl">
                      {loadingAuditLogs ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#A8A6B8]">
                          <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
                          <span className="text-xs font-medium">Fetching real-time platform telemetry…</span>
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <div className="py-16 text-center text-[#5C5A70] text-xs space-y-2">
                          <Activity size={24} className="mx-auto text-[#3A3A52]" />
                          <p>No activity logs recorded matching criteria.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#0F0F1A] border-b border-[#3A3A52] text-[#A8A6B8] uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-3 px-4">Timestamp</th>
                                <th className="py-3 px-4">Actor / User</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Event / Action</th>
                                <th className="py-3 px-4">Description</th>
                                <th className="py-3 px-4">Device & IP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3A3A52]/60 text-[#F5F3ED]">
                              {auditLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-[#2A2A3E]/40 transition">
                                  <td className="py-3 px-4 text-[#A8A6B8] font-mono whitespace-nowrap text-[11px]">
                                    {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 font-semibold">
                                    {log.actor_name || "System"}
                                    {log.actor_email && <div className="text-[10px] text-[#5C5A70]">{log.actor_email}</div>}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                      log.actor_role === "admin" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                    }`}>
                                      {log.actor_role || "user"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-[#C9A84C] text-[11px]">
                                    {log.action_type}
                                  </td>
                                  <td className="py-3 px-4 text-[#A8A6B8] max-w-xs truncate">
                                    {log.description}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px] text-[#5C5A70]">
                                    <div>{log.ip_address || "127.0.0.1"}</div>
                                    {log.user_agent && (
                                      <div className="text-[9px] truncate max-w-[120px]" title={log.user_agent}>
                                        {log.user_agent.split(" ")[0]}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── KYC DOCUMENT PHOTO INSPECTOR & REJECTION MODAL ── */}
        {rejectingKycUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F3ED] flex items-center gap-2">
                      <span>KYC Document Inspector</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-bold uppercase">
                        {(rejectingKycUser as any).kyc_id_type?.replace("_", " ") || "Passport/ID"}
                      </span>
                    </h3>
                    <p className="text-xs text-[#5C5A70]">
                      User: {rejectingKycUser.full_name} (@{rejectingKycUser.username}) · Role: <span className="uppercase text-[#F5F3ED]">{rejectingKycUser.role}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRejectingKycUser(null);
                    setKycRejectionReason("");
                  }}
                  className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Uploaded Document Lightbox Grid */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0F0F1A]">
                <h4 className="text-xs font-bold text-[#A8A6B8] uppercase tracking-wider">Uploaded ID Document Photos</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front ID */}
                  <div className="p-3.5 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-2">
                    <span className="text-xs font-bold text-[#F5F3ED] block">1. Front ID Image</span>
                    {(rejectingKycUser as any).kyc_front_url ? (
                      <a href={(rejectingKycUser as any).kyc_front_url} target="_blank" rel="noreferrer" className="block relative h-44 rounded-xl overflow-hidden border border-[#3A3A52] hover:border-[#C9A84C] transition group">
                        <img src={(rejectingKycUser as any).kyc_front_url} alt="Front ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">
                          View High-Res ↗
                        </div>
                      </a>
                    ) : (
                      <div className="h-44 rounded-xl bg-[#0F0F1A] border border-dashed border-[#3A3A52] flex items-center justify-center text-xs text-[#5C5A70]">Not Uploaded</div>
                    )}
                  </div>

                  {/* Back ID */}
                  <div className="p-3.5 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-2">
                    <span className="text-xs font-bold text-[#F5F3ED] block">2. Back ID Image</span>
                    {(rejectingKycUser as any).kyc_back_url ? (
                      <a href={(rejectingKycUser as any).kyc_back_url} target="_blank" rel="noreferrer" className="block relative h-44 rounded-xl overflow-hidden border border-[#3A3A52] hover:border-[#C9A84C] transition group">
                        <img src={(rejectingKycUser as any).kyc_back_url} alt="Back ID" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">
                          View High-Res ↗
                        </div>
                      </a>
                    ) : (
                      <div className="h-44 rounded-xl bg-[#0F0F1A] border border-dashed border-[#3A3A52] flex items-center justify-center text-xs text-[#5C5A70]">Not Uploaded (Optional)</div>
                    )}
                  </div>

                  {/* Selfie Photo */}
                  <div className="p-3.5 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-2">
                    <span className="text-xs font-bold text-[#F5F3ED] block">3. Selfie Photo</span>
                    {(rejectingKycUser as any).kyc_selfie_url ? (
                      <a href={(rejectingKycUser as any).kyc_selfie_url} target="_blank" rel="noreferrer" className="block relative h-44 rounded-xl overflow-hidden border border-[#3A3A52] hover:border-[#C9A84C] transition group">
                        <img src={(rejectingKycUser as any).kyc_selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">
                          View High-Res ↗
                        </div>
                      </a>
                    ) : (
                      <div className="h-44 rounded-xl bg-[#0F0F1A] border border-dashed border-[#3A3A52] flex items-center justify-center text-xs text-[#5C5A70]">Not Uploaded</div>
                    )}
                  </div>

                  {/* Business Cert */}
                  <div className="p-3.5 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-2">
                    <span className="text-xs font-bold text-[#C9A84C] block">4. Business Cert (Builders)</span>
                    {(rejectingKycUser as any).kyc_business_cert_url ? (
                      <a href={(rejectingKycUser as any).kyc_business_cert_url} target="_blank" rel="noreferrer" className="block relative h-44 rounded-xl overflow-hidden border border-[#3A3A52] hover:border-[#C9A84C] transition group">
                        <img src={(rejectingKycUser as any).kyc_business_cert_url} alt="Business Cert" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">
                          View High-Res ↗
                        </div>
                      </a>
                    ) : (
                      <div className="h-44 rounded-xl bg-[#0F0F1A] border border-dashed border-[#3A3A52] flex items-center justify-center text-xs text-[#5C5A70]">Not Uploaded (Founders Only)</div>
                    )}
                  </div>
                </div>

                {/* Rejection Note Box */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-[#A8A6B8] block mb-1.5">Optional Rejection Reason Feedback (Sent to user email)</label>
                  <textarea
                    rows={2}
                    value={kycRejectionReason}
                    onChange={(e) => setKycRejectionReason(e.target.value)}
                    placeholder="e.g. Front ID photo was blurry. Please resubmit a clear photo."
                    className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-3 text-xs text-[#F5F3ED] outline-none focus:border-red-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    await rejectKYC(rejectingKycUser.id);
                    setRejectingKycUser(null);
                    setKycRejectionReason("");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold transition cursor-pointer"
                >
                  Decline KYC Submission
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await approveKYC(rejectingKycUser.id);
                    setRejectingKycUser(null);
                    setKycRejectionReason("");
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  ✓ Approve KYC & Issue Verification Checkmark
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── PASSCODE SETTINGS MODAL ── */}
        {showPasscodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl p-6 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#3A3A52] pb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#F5F3ED]">
                  <KeyRound size={18} className="text-[#C9A84C]" />
                  <span>Configure Security Access Code</span>
                </div>
                <button
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscodeChangeMsg(null);
                  }}
                  className="text-[#5C5A70] hover:text-[#F5F3ED] transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-[#A8A6B8] leading-relaxed">
                The Master Security Access Code protects the Universal Audit Vault. You can configure your custom passcode in your environment variables:
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-xs font-mono space-y-1.5">
                <div className="text-[#5C5A70]"># In .env.local file:</div>
                <div className="text-[#C9A84C]">ADMIN_ACCESS_CODE=779933</div>
              </div>

              <p className="text-xs text-[#5C5A70]">
                To change your passcode, update <code className="text-[#F5F3ED]">ADMIN_ACCESS_CODE</code> in your environment file or deployment dashboard.
              </p>

              <button
                onClick={() => setShowPasscodeModal(false)}
                className="w-full py-3 rounded-xl bg-[#0F0F1A] hover:bg-[#2A2A3E] border border-[#3A3A52] text-[#F5F3ED] font-bold text-xs transition cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* ── USER PROFILE EDITOR MODAL ── */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
                    <Edit size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F3ED]">
                      Edit User Profile: {editingUser.full_name}
                    </h3>
                    <p className="text-xs text-[#5C5A70]">ID: {editingUser.id}</p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingUser(null)}
                  className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body Form */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#0F0F1A]">
                
                {/* Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={editFormData.full_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                      className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Username</label>
                    <input
                      type="text"
                      value={editFormData.username || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                </div>

                {/* Role & Plan Tier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Platform Role</label>
                    <select
                      value={editFormData.role || "investor"}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C] capitalize"
                    >
                      <option value="investor">Investor</option>
                      <option value="builder">Builder</option>
                      <option value="talent">Talent (Job Seeker)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Subscription Tier</label>
                    <select
                      value={editFormData.subscription_tier || "free"}
                      onChange={(e) => setEditFormData({ ...editFormData, subscription_tier: e.target.value })}
                      className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C] font-bold"
                    >
                      <option value="free">Free Tier</option>
                      <option value="pro">Pro Plan</option>
                      <option value="premium">Premium Plan</option>
                    </select>
                  </div>
                </div>

                {/* Country & Trust Score */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Country / Region</label>
                    <input
                      type="text"
                      value={editFormData.country || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                      placeholder="e.g. United States, Nigeria, UK"
                      className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#A8A6B8] block mb-1.5">Trust Score (0 - 100)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editFormData.trust_score ?? 85}
                        onChange={(e) => setEditFormData({ ...editFormData, trust_score: parseInt(e.target.value) || 0 })}
                        className="w-24 bg-[#1A1A2E] border border-[#3A3A52] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#C9A84C] outline-none focus:border-[#C9A84C]"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, trust_score: 0 })}
                          className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20"
                        >
                          0 (Scam)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, trust_score: 85 })}
                          className="px-2 py-1 rounded-lg bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] text-[10px] font-bold hover:text-white"
                        >
                          85 (Normal)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, trust_score: 100 })}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20"
                        >
                          100 (Max)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio / Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#A8A6B8]">Bio & Summary</label>
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, bio: "" })}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Clear / Reset Bio
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={editFormData.bio || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    placeholder="User profile bio..."
                    className="w-full bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-3 text-xs text-[#F5F3ED] outline-none focus:border-[#C9A84C] leading-relaxed"
                  />
                </div>

                {/* Safety & Moderation Flags Section */}
                <div className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-3">
                  <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-red-400" />
                    <span>Safety, Verification & Account Moderation</span>
                  </h4>

                  <div className="space-y-2.5 pt-1">
                    {/* SCAM FLAG */}
                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0A0A0F] border border-red-500/30 cursor-pointer hover:border-red-500 transition">
                      <input
                        type="checkbox"
                        checked={!!editFormData.is_scam}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditFormData({
                            ...editFormData,
                            is_scam: checked,
                            ...(checked ? { trust_score: 0, is_verified: false } : { trust_score: 85 })
                          });
                        }}
                        className="mt-0.5 h-4 w-4 rounded accent-red-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-red-400">⚠️ Flag as SCAM / Fraud Alert</div>
                        <div className="text-[11px] text-[#A8A6B8]">
                          Displays a prominent red SCAM ALERT warning banner on this user's profile and across chats, deal rooms, and talent directories.
                        </div>
                      </div>
                    </label>

                    {/* BAN / SUSPEND */}
                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0A0A0F] border border-zinc-600/50 cursor-pointer hover:border-yellow-500 transition">
                      <input
                        type="checkbox"
                        checked={!!editFormData.is_banned}
                        onChange={(e) => setEditFormData({ ...editFormData, is_banned: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded accent-yellow-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-zinc-300">🚫 Suspend / Ban User Account</div>
                        <div className="text-[11px] text-[#A8A6B8]">
                          Prevents user from posting jobs, applying, creating projects, or messaging other members.
                        </div>
                      </div>
                    </label>

                    {/* VERIFIED KYC */}
                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] cursor-pointer hover:border-emerald-500 transition">
                      <input
                        type="checkbox"
                        checked={!!editFormData.is_verified}
                        onChange={(e) => setEditFormData({ ...editFormData, is_verified: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-emerald-400">✓ Verified Identity (KYC Approved)</div>
                        <div className="text-[11px] text-[#A8A6B8]">
                          Grants official verification checkmark badge on user profile.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveUserEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] text-xs font-bold transition shadow-lg shadow-[#C9A84C]/25 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes…</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── READ-ONLY CONVERSATION THREAD INSPECTOR MODAL ── */}
        {inspectingConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C]">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F3ED] flex items-center gap-2">
                      <span>Thread Inspector (Read-Only)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold uppercase">
                        Admin Audit Mode
                      </span>
                    </h3>
                    <p className="text-xs text-[#5C5A70]">
                      Between {inspectingConversation.participant1?.full_name || 'User 1'} and {inspectingConversation.participant2?.full_name || 'User 2'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingConversation(null)}
                  className="p-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Thread Messages Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#0F0F1A]">
                {!inspectingConversation.messages || inspectingConversation.messages.length === 0 ? (
                  <p className="text-center text-xs text-[#5C5A70] py-8">No messages recorded in this conversation thread.</p>
                ) : (
                  inspectingConversation.messages.map((msg: any) => (
                    <div key={msg.id} className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#F5F3ED]">{msg.sender?.full_name || 'Sender'}</span>
                          <span className="text-[10px] text-[#5C5A70]">@{msg.sender?.username || 'user'}</span>
                          <span className="text-[10px] text-[#5C5A70] font-mono">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              const { data: { session } } = await supabase.auth.getSession();
                              await fetch("/api/admin/messages", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
                                body: JSON.stringify({ messageId: msg.id, action: "delete_message" })
                              });
                              showNotification("Deleted message from thread! 🗑️");
                              setInspectingConversation({
                                ...inspectingConversation,
                                messages: inspectingConversation.messages.filter((m: any) => m.id !== msg.id)
                              });
                              void fetchAdminData();
                            }}
                            className="px-2 py-1 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-[10px] font-semibold transition cursor-pointer"
                          >
                            Delete Message
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#F5F3ED] font-mono leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#3A3A52] bg-[#0A0A0F] flex items-center justify-end">
                <button
                  onClick={() => setInspectingConversation(null)}
                  className="px-5 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] text-xs font-semibold transition cursor-pointer"
                >
                  Close Thread Inspector
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}