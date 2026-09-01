"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass, MessageCircle, Calendar, Bookmark,
  User, LayoutGrid, Upload, TrendingUp, Users,
  Bell, LogOut, Menu, X, Handshake, Sparkles, Gift,
  Briefcase, Search, FileText, ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

type NavItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
};

const INVESTOR_NAV: NavItem[] = [
  { id: "explore", icon: Compass, label: "Explore", href: "/dashboard/investor" },
  { id: "matches", icon: Sparkles, label: "AI Matches", href: "/dashboard/matches" },
  { id: "chats", icon: MessageCircle, label: "Messages", href: "/dashboard/chats" },
  { id: "notifications", icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
  { id: "deals", icon: Handshake, label: "Deals", href: "/dashboard/deals" },
  { id: "talent-search", icon: Users, label: "Talent Search", href: "/dashboard/talent-search" },
  { id: "meetings", icon: Calendar, label: "Meetings", href: "/dashboard/meetings" },
  { id: "bookmarks", icon: Bookmark, label: "Saved", href: "/dashboard/bookmarks" },
  { id: "jobs", icon: Briefcase, label: "Manage Jobs", href: "/dashboard/jobs/manage" },
  { id: "community", icon: Users, label: "Community", href: "/dashboard/community" },
  { id: "referrals", icon: Gift, label: "Refer & earn", href: "/dashboard/referrals" },
  { id: "profile", icon: User, label: "Profile", href: "/dashboard/profile" },
];

const BUILDER_NAV: NavItem[] = [
  { id: "projects", icon: LayoutGrid, label: "My Projects", href: "/dashboard/builder" },
  { id: "investors", icon: TrendingUp, label: "Find Investors", href: "/dashboard/investors" },
  { id: "upload", icon: Upload, label: "Upload Project", href: "/dashboard/builder/upload" },
  { id: "chats", icon: MessageCircle, label: "Messages", href: "/dashboard/chats" },
  { id: "notifications", icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
  { id: "meetings", icon: Calendar, label: "Meetings", href: "/dashboard/meetings" },
  { id: "deals", icon: Handshake, label: "Deals", href: "/dashboard/deals" },
  { id: "talent-search", icon: Users, label: "Talent Search", href: "/dashboard/talent-search" },
  { id: "jobs", icon: Briefcase, label: "Manage Jobs", href: "/dashboard/jobs/manage" },
  { id: "community", icon: Users, label: "Community", href: "/dashboard/community" },
  { id: "team", icon: Users, label: "Team", href: "/dashboard/team" },
  { id: "referrals", icon: Gift, label: "Refer & earn", href: "/dashboard/referrals" },
  { id: "profile", icon: User, label: "Profile", href: "/dashboard/profile" },
];

const TALENT_NAV: NavItem[] = [
  { id: "jobs", icon: Search, label: "Browse Jobs", href: "/dashboard/talent" },
  { id: "applications", icon: FileText, label: "Applications", href: "/dashboard/talent/applications" },
  { id: "saved", icon: Bookmark, label: "Saved Jobs", href: "/dashboard/talent/saved" },
  { id: "chats", icon: MessageCircle, label: "Messages", href: "/dashboard/chats" },
  { id: "notifications", icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
  { id: "community", icon: Users, label: "Community", href: "/dashboard/community" },
  { id: "referrals", icon: Gift, label: "Refer & earn", href: "/dashboard/referrals" },
  { id: "profile", icon: User, label: "Profile", href: "/dashboard/profile" },
];

interface Props {
  children: React.ReactNode;
  role?: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string | null;
  unreadMessageCount?: number;
  unreadNotificationCount?: number;
}

export default function DashboardShell({
  children,
  role,
  fullName,
  username,
  avatarUrl,
  unreadMessageCount = 0,
  unreadNotificationCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>(role || "investor");

  useEffect(() => {
    if (role) {
      setCurrentRole(role);
      try {
        sessionStorage.setItem("user_role", role);
        localStorage.setItem("user_role", role);
      } catch {}
    } else {
      try {
        const cached = sessionStorage.getItem("user_role") || localStorage.getItem("user_role");
        if (cached && (cached === "talent" || cached === "builder" || cached === "investor" || cached === "admin")) {
          setCurrentRole(cached);
        }
      } catch {}
    }
  }, [role]);

  const [notifCount, setNotifCount] = useState<number | null>(
    unreadNotificationCount !== undefined ? unreadNotificationCount : null
  );
  const [msgCount, setMsgCount] = useState<number | null>(
    unreadMessageCount !== undefined ? unreadMessageCount : null
  );

  const [userData, setUserData] = useState<{
    fullName: string;
    username: string;
    avatarUrl: string | null;
    subscriptionTier?: string;
    isVerified?: boolean;
  }>({
    fullName: fullName || "",
    username: username || "",
    avatarUrl: avatarUrl ?? null,
  });

  // Keep userData in sync whenever parent component props change
  useEffect(() => {
    if (fullName || username || avatarUrl !== undefined) {
      setUserData(prev => ({
        fullName: fullName !== undefined && fullName !== "" ? fullName : prev.fullName,
        username: username !== undefined && username !== "" ? username : prev.username,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : prev.avatarUrl,
        subscriptionTier: prev.subscriptionTier,
        isVerified: prev.isVerified,
      }));
    }
  }, [fullName, username, avatarUrl]);

  // Global event listener for instant profile updates across all pages
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setUserData(prev => ({
          fullName: detail.full_name || detail.fullName || prev.fullName,
          username: detail.username || prev.username,
          avatarUrl: detail.avatar_url !== undefined ? detail.avatar_url : detail.avatarUrl !== undefined ? detail.avatarUrl : prev.avatarUrl,
          subscriptionTier: detail.subscription_tier !== undefined ? detail.subscription_tier : prev.subscriptionTier,
          isVerified: detail.is_verified !== undefined ? detail.is_verified : prev.isVerified,
        }));
        if (detail.role) {
          setCurrentRole(detail.role);
        }
      }
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  const selectedRole = currentRole === "builder" ? "builder" : currentRole === "talent" ? "talent" : "investor";
  const navItems = selectedRole === "talent" ? TALENT_NAV : selectedRole === "builder" ? BUILDER_NAV : INVESTOR_NAV;

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("user_role");
        localStorage.removeItem("user_role");
      }
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Logout execution crash encountered:", err);
    }
  };

  const isActive = (href: string) => {
    if (href === "/dashboard/jobs/manage") {
      return pathname.startsWith("/dashboard/jobs");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const displayNotifCount = unreadNotificationCount !== undefined ? unreadNotificationCount : (notifCount ?? 0);
  const displayMsgCount = unreadMessageCount !== undefined ? unreadMessageCount : (msgCount ?? 0);

  useEffect(() => {
    let channel: any;

    const fetchUserDataAndNotifications = async () => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const user = sessionRes?.session?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, role, subscription_tier, is_verified")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setUserData({
            fullName: profile.full_name || "",
            username: profile.username || "",
            avatarUrl: profile.avatar_url || null,
            subscriptionTier: profile.subscription_tier,
            isVerified: profile.is_verified,
          });
          if (profile.role) {
            setCurrentRole(profile.role);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("user_role", profile.role);
              localStorage.setItem("user_role", profile.role);
            }
          }
        }

        const fetchCount = async () => {
          try {
            const res = await fetch(`/api/notifications?userId=${user.id}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                const unread = data.filter((n: any) => !n.is_read).length;
                setNotifCount(unread);
                return;
              }
            }
          } catch {}

          try {
            const { count, error } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .neq("type", "message")
              .eq("is_read", false);

            if (!error && count !== null) {
              setNotifCount(count);
            }
          } catch {}
        };

        const fetchMsgCount = async () => {
          try {
            const res = await fetch(`/api/messages/unread-count?userId=${user.id}`);
            if (res.ok) {
              const data = await res.json();
              if (typeof data.count === "number") {
                setMsgCount(data.count);
                return;
              }
            }
          } catch {}

          try {
            const { data: userConvos } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("user_id", user.id);

            if (userConvos && userConvos.length > 0) {
              const convoIds = userConvos.map((c: any) => c.conversation_id);
              const { data: unreadRows } = await supabase
                .from("messages")
                .select("id, delivery_status")
                .in("conversation_id", convoIds)
                .neq("sender_id", user.id);

              const unreadTotal = (unreadRows || []).filter(
                (m: any) => m.delivery_status !== "read"
              ).length;

              setMsgCount(unreadTotal);
            } else {
              setMsgCount(0);
            }
          } catch {}
        };

        if (unreadNotificationCount === undefined) {
          await fetchCount();
        }

        if (unreadMessageCount === undefined) {
          await fetchMsgCount();
        }

        // Realtime subscription for live notifications & messages with unique channel ID
        const channelName = `dashboard-counts-${user.id}-${Date.now()}`;
        channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchCount();
              fetchMsgCount();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
            },
            () => {
              fetchMsgCount();
            }
          )
          .subscribe();

        // Listen for instant in-app events
        const handleRefresh = () => {
          if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
          fetchMsgCount();
          fetchCount();
        };

        // When user switches back to this tab, refresh counts immediately
        const handleVisibilityChange = () => {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            fetchMsgCount();
            fetchCount();
          }
        };

        window.addEventListener("messages-read", handleRefresh);
        window.addEventListener("unread-count-updated", handleRefresh);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);

        // Smart tab visibility polling: pause when backgrounded/minimized, poll when active
        const pollInterval = setInterval(() => {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            fetchMsgCount();
            fetchCount();
          }
        }, 15000);

        (window as any)._msgPollInterval = pollInterval;
        (window as any)._dashboardCleanups = () => {
          window.removeEventListener("messages-read", handleRefresh);
          window.removeEventListener("unread-count-updated", handleRefresh);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          window.removeEventListener("focus", handleVisibilityChange);
        };

      } catch (err) {
        console.error("Dashboard shell bootstrap profile/count resolution notice:", err);
      }
    };

    fetchUserDataAndNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if ((window as any)._msgPollInterval) {
        clearInterval((window as any)._msgPollInterval);
      }
      if ((window as any)._dashboardCleanups) {
        (window as any)._dashboardCleanups();
      }
    };
  }, [supabase, unreadNotificationCount, unreadMessageCount]);

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex w-full max-w-full overflow-x-clip">

      {/* Desktop Sidebar */}
      <aside suppressHydrationWarning className="hidden md:flex flex-col w-56 border-r border-[#3A3A52] shrink-0 fixed top-0 left-0 h-full z-30 bg-[#0F0F1A]">
        <div className="px-5 py-4 border-b border-[#3A3A52] flex items-center gap-3">
          <img src="/logo-icon.png" alt="REACH" className="w-8 h-8 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-wider text-[#F5F3ED] leading-tight">
              R<span className="text-[#C9A84C]">EACH</span>
            </div>
            <div suppressHydrationWarning className="text-[11px] text-[#5C5A70] capitalize truncate">
              {currentRole} dashboard
            </div>
          </div>
        </div>

        <nav suppressHydrationWarning className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition w-full text-left ${
                  active
                    ? "bg-[#C9A84C20] text-[#C9A84C] font-medium"
                    : "text-[#A8A6B8] hover:bg-[#1A1A2E] hover:text-[#F5F3ED]"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span>{item.label}</span>
                
                {item.id === "chats" && displayMsgCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-bold animate-pulse">
                    {displayMsgCount}
                  </span>
                )}

                {item.id === "notifications" && displayNotifCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-bold">
                    {displayNotifCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#3A3A52]">
          {currentRole === "admin" && (
            <button
              onClick={() => router.push("/admin")}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-[#C9A84C15] border border-[#C9A84C40] text-[#C9A84C] hover:bg-[#C9A84C25] transition text-xs font-bold mb-2 shadow-sm"
            >
              <ShieldCheck size={14} />
              <span>Admin Control Panel</span>
            </button>
          )}

          <button
            onClick={() => router.push("/dashboard/profile")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#1A1A2E] transition mb-1"
          >
            <div className="relative w-8 h-8 rounded-full bg-[#C9A84C20] text-[#C9A84C] text-xs font-medium flex items-center justify-center shrink-0 overflow-hidden">
              {userData.avatarUrl ? (
                <Image
                  src={userData.avatarUrl}
                  alt={userData.fullName || "User avatar"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span>{getInitials(userData.fullName)}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#F5F3ED] text-xs font-medium truncate">
                  {userData.fullName || "Loading…"}
                </span>
                <VerifiedBadge 
                  tier={userData.subscriptionTier} 
                  isVerified={userData.isVerified} 
                  size={14} 
                />
              </div>
              <div className="text-[#5C5A70] text-xs truncate">
                @{userData.username || "username"}
              </div>
            </div>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[#5C5A70] hover:text-red-400 hover:bg-[#1A1A2E] transition text-sm"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      {/* 💡 FIXED: Adjusted left/right margins and spacing so items map perfectly to screen padding bounds */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#0F0F1A] border-b border-[#3A3A52] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1">
            <Menu size={20} className="text-[#A8A6B8]" />
          </button>
          <img src="/logo-icon.png" alt="REACH" className="w-7 h-7 rounded shrink-0" />
          <div className="text-base font-bold tracking-wider text-[#F5F3ED]">
            R<span className="text-[#C9A84C]">EACH</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/dashboard/chats")} 
            className="relative p-1.5 rounded-lg text-[#A8A6B8] hover:text-[#F5F3ED] transition"
            title="Messages"
          >
            <MessageCircle size={20} />
            {displayMsgCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#C9A84C] text-[#1A1A2E] text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse shadow-md shadow-black/60">
                {displayMsgCount > 99 ? "99+" : displayMsgCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => router.push("/dashboard/notifications")} 
            className="relative p-1.5 rounded-lg text-[#A8A6B8] hover:text-[#F5F3ED] transition"
            title="Notifications"
          >
            <Bell size={20} />
            {displayNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#C9A84C] text-[#1A1A2E] text-[10px] rounded-full flex items-center justify-center font-bold shadow-md shadow-black/60">
                {displayNotifCount > 99 ? "99+" : displayNotifCount}
              </span>
            )}
          </button>

          <div className="relative w-8 h-8 rounded-full bg-[#C9A84C20] text-[#C9A84C] text-xs font-medium flex items-center justify-center overflow-hidden shrink-0 ml-1">
            {userData.avatarUrl ? (
              <Image
                src={userData.avatarUrl}
                alt={userData.fullName || "User avatar"}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span>{getInitials(userData.fullName)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="w-64 bg-[#0F0F1A] border-l border-[#3A3A52] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#3A3A52]">
              <div className="flex items-center gap-2">
                <img src="/logo-icon.png" alt="REACH" className="w-7 h-7 rounded shrink-0" />
                <div className="text-lg font-bold tracking-wider text-[#F5F3ED]">
                  R<span className="text-[#C9A84C]">EACH</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={20} className="text-[#A8A6B8]" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.id}
                    onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition w-full text-left ${
                      active
                        ? "bg-[#C9A84C20] text-[#C9A84C] font-medium"
                        : "text-[#A8A6B8] hover:bg-[#1A1A2E]"
                    }`}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>

                    {item.id === "chats" && displayMsgCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-bold animate-pulse">
                        {displayMsgCount > 99 ? "99+" : displayMsgCount}
                      </span>
                    )}

                    {item.id === "notifications" && displayNotifCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-bold">
                        {displayNotifCount > 99 ? "99+" : displayNotifCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-[#3A3A52]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[#5C5A70] hover:text-red-400 transition text-sm"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      {/* 💡 FIXED: Swapped out md:ml-56 block behavior for standard desktop margin structure, added min-w-0, w-full, and layout bounds containment hooks */}
      <main className="flex-1 flex flex-col min-w-0 w-full max-w-full md:pl-56 overflow-x-clip">
        
        {/* Desktop Header Spacer */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[#3A3A52] sticky top-0 bg-[#0F0F1A] z-20 w-full">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/chats")}
              className="relative w-9 h-9 flex items-center justify-center border border-[#3A3A52] rounded-lg hover:bg-[#1A1A2E] transition"
              title="Messages"
            >
              <MessageCircle size={17} className="text-[#A8A6B8]" />
              {displayMsgCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {displayMsgCount > 99 ? "99+" : displayMsgCount}
                </span>
              )}
            </button>

            <button
              onClick={() => router.push("/dashboard/notifications")}
              className="relative w-9 h-9 flex items-center justify-center border border-[#3A3A52] rounded-lg hover:bg-[#1A1A2E] transition"
              title="Notifications"
            >
              <Bell size={17} className="text-[#A8A6B8]" />
              {displayNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">
                  {displayNotifCount > 99 ? "99+" : displayNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Inner Content Grid */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-20 md:pt-4 pb-24 md:pb-8 overflow-x-clip">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Footer Navigation Tray */}
      <nav suppressHydrationWarning className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F0F1A] border-t border-[#3A3A52] flex z-30 h-16 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <div className="relative flex items-center justify-center">
                <Icon size={19} className={active ? "text-[#C9A84C]" : "text-[#5C5A70]"} />
                {item.id === "chats" && displayMsgCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#C9A84C] text-[#1A1A2E] text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse shadow-md shadow-black/60">
                    {displayMsgCount > 99 ? "99+" : displayMsgCount}
                  </span>
                )}
                {item.id === "notifications" && displayNotifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#C9A84C] text-[#1A1A2E] text-[10px] rounded-full flex items-center justify-center font-bold shadow-md shadow-black/60">
                    {displayNotifCount > 99 ? "99+" : displayNotifCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] truncate max-w-[60px] ${active ? "text-[#C9A84C] font-medium" : "text-[#5C5A70]"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}