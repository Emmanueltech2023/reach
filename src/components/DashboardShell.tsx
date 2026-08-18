"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass, MessageCircle, Calendar, Bookmark,
  User, LayoutGrid, Upload, TrendingUp, Users,
  Bell, LogOut, Menu, X, Handshake, Sparkles, Gift,
  Briefcase, Search, FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  { id: "deals", icon: Handshake, label: "Deals", href: "/dashboard/deals" },
  { id: "meetings", icon: Calendar, label: "Meetings", href: "/dashboard/meetings" },
  { id: "bookmarks", icon: Bookmark, label: "Saved", href: "/dashboard/bookmarks" },
  { id: "community", icon: Users, label: "Community", href: "/dashboard/community" },
  { id: "referrals", icon: Gift, label: "Refer & earn", href: "/dashboard/referrals" },
  { id: "post-job", icon: Briefcase, label: "Post a Job", href: "/dashboard/jobs/post" },
  { id: "profile", icon: User, label: "Profile", href: "/dashboard/profile" },
];

const BUILDER_NAV: NavItem[] = [
  { id: "projects", icon: LayoutGrid, label: "My Projects", href: "/dashboard/builder" },
  { id: "investors", icon: TrendingUp, label: "Find Investors", href: "/dashboard/investors" },
  { id: "upload", icon: Upload, label: "Upload Project", href: "/dashboard/builder/upload" },
  { id: "chats", icon: MessageCircle, label: "Messages", href: "/dashboard/chats" },
  { id: "meetings", icon: Calendar, label: "Meetings", href: "/dashboard/meetings" },
  { id: "deals", icon: Handshake, label: "Deals", href: "/dashboard/deals" },
  { id: "community", icon: Users, label: "Community", href: "/dashboard/community" },
  { id: "team", icon: Users, label: "Team", href: "/dashboard/team" },
  { id: "post-job", icon: Briefcase, label: "Post a Job", href: "/dashboard/jobs/post" },
  { id: "referrals", icon: Gift, label: "Refer & earn", href: "/dashboard/referrals" },
  { id: "profile", icon: User, label: "Profile", href: "/dashboard/profile" },
];

const TALENT_NAV: NavItem[] = [
  { id: "jobs", icon: Search, label: "Browse Jobs", href: "/dashboard/talent" },
  { id: "applications", icon: FileText, label: "Applications", href: "/dashboard/talent/applications" },
  { id: "saved", icon: Bookmark, label: "Saved Jobs", href: "/dashboard/talent/saved" },
  { id: "chats", icon: MessageCircle, label: "Messages", href: "/dashboard/chats" },
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
  unreadNotificationCount = 0,
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
        if (cached && (cached === "talent" || cached === "builder" || cached === "investor")) {
          setCurrentRole(cached);
        }
      } catch {}
    }
  }, [role]);

  const [notifCount, setNotifCount] = useState<number | null>(
    unreadNotificationCount > 0 ? unreadNotificationCount : null
  );

  const [userData, setUserData] = useState<{
    fullName: string;
    username: string;
    avatarUrl: string | null;
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const displayNotifCount = unreadNotificationCount !== undefined ? unreadNotificationCount : (notifCount ?? 0);

  useEffect(() => {
    let channel: any;

    const fetchUserDataAndNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserData({
            fullName: profile.full_name || "",
            username: profile.username || "",
            avatarUrl: profile.avatar_url || null,
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
          const { count, error } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

          if (!error && count !== null) {
            setNotifCount(count);
          }
        };

        if (unreadNotificationCount === undefined) {
          await fetchCount();
        }

        // Realtime subscription for live notifications with unique channel ID
        const channelName = `notifications-${user.id}-${Date.now()}`;
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
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Dashboard shell bootstrap profile/count resolution failed:", err);
      }
    };

    fetchUserDataAndNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, unreadNotificationCount]);

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex w-full max-w-full overflow-x-clip">

      {/* Desktop Sidebar */}
      <aside suppressHydrationWarning className="hidden md:flex flex-col w-56 border-r border-[#3A3A52] shrink-0 fixed top-0 left-0 h-full z-30 bg-[#0F0F1A]">
        <div className="px-5 py-5 border-b border-[#3A3A52]">
          <div className="text-xl font-bold tracking-wider text-[#F5F3ED]">
            R<span className="text-[#C9A84C]">EACH</span>
          </div>
          <div suppressHydrationWarning className="text-xs text-[#5C5A70] mt-0.5 capitalize">
            {currentRole} dashboard
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
                
                {item.id === "chats" && unreadMessageCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-medium animate-pulse">
                    {unreadMessageCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#3A3A52]">
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
              <div className="text-[#F5F3ED] text-xs font-medium truncate">
                {userData.fullName || "Loading…"}
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
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-1 -ml-1">
            <Menu size={20} className="text-[#A8A6B8]" />
          </button>
          <div className="text-base font-bold tracking-wider text-[#F5F3ED]">
            R<span className="text-[#C9A84C]">EACH</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/notifications")} className="relative p-1">
            <Bell size={20} className="text-[#A8A6B8]" />
            {displayNotifCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">
                {displayNotifCount}
              </span>
            )}
          </button>
          <div className="relative w-8 h-8 rounded-full bg-[#C9A84C20] text-[#C9A84C] text-xs font-medium flex items-center justify-center overflow-hidden shrink-0">
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
              <div className="text-lg font-bold tracking-wider text-[#F5F3ED]">
                R<span className="text-[#C9A84C]">EACH</span>
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

                    {item.id === "chats" && unreadMessageCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-medium">
                        {unreadMessageCount}
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
              onClick={() => router.push("/dashboard/notifications")}
              className="relative w-9 h-9 flex items-center justify-center border border-[#3A3A52] rounded-lg hover:bg-[#1A1A2E] transition"
            >
              <Bell size={17} className="text-[#A8A6B8]" />
              {displayNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-xs flex items-center justify-center font-medium">
                  {displayNotifCount}
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
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative"
            >
              <Icon size={18} className={active ? "text-[#C9A84C]" : "text-[#5C5A70]"} />
              <span className={`text-[10px] tracking-tight ${active ? "text-[#C9A84C] font-medium" : "text-[#5C5A70]"}`}>
                {item.label}
              </span>

              {item.id === "chats" && unreadMessageCount > 0 && (
                <span className="absolute top-2 right-4 w-4 h-4 bg-[#C9A84C] rounded-full text-[#1A1A2E] text-[10px] flex items-center justify-center font-bold">
                  {unreadMessageCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}