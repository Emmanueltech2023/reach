"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Bell, MessageCircle, Calendar, TrendingUp,
  ShieldCheck, Star, Info, Loader2, CheckCheck, Briefcase
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  message: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-900/30" },
  meeting: { icon: Calendar, color: "text-purple-400", bg: "bg-purple-900/30" },
  deal: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-900/30" },
  kyc: { icon: ShieldCheck, color: "text-yellow-400", bg: "bg-yellow-900/30" },
  match: { icon: Star, color: "text-[#C9A84C]", bg: "bg-[#C9A84C20]" },
  interest: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-900/30" },
  job_application: { icon: Briefcase, color: "text-[#C9A84C]", bg: "bg-[#C9A84C20]" },
  general: { icon: Info, color: "text-[#A8A6B8]", bg: "bg-[#1A1A2E]" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
    role: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("🔍 Diagnostic [Auth]: Failed to get user", authError);
      if (!user) {
        console.warn("🔍 Diagnostic [Auth]: No active user session found. Aborting.");
        return;
      }
      setCurrentUserId(user.id);

      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("full_name, username, role")
        .eq("id", user.id)
        .single();
        
      if (profError) console.warn("🔍 Diagnostic [Profile]: Issue fetching profile", profError);
      if (prof) setProfile(prof);

      const targetUrl = `/api/notifications?userId=${user.id}`;
      const res = await fetch(targetUrl);
      
      if (!res.ok) {
        let errorPayload: unknown = null;
        try {
          errorPayload = await res.json();
        } catch {
          try {
            errorPayload = await res.text();
          } catch {
            errorPayload = "Could not parse error response body text.";
          }
        }

        console.error("❌ --- API DIAGNOSTIC FAILURE BREAKDOWN --- ❌");
        console.error(`• Endpoint: ${targetUrl}`);
        console.error(`• Status Code: ${res.status} (${res.statusText})`);
        console.error("• Server Payload:", errorPayload);
        console.error("---------------------------------------------");

        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setNotifications(data || []);
      
    } catch (error) {
      console.error("💥 Notifications fetch exception error detail:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const loadNotifications = async () => {
      await fetchData();
    };

    void loadNotifications();
  }, [fetchData]);

  // Realtime notification sync channels
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const markAllRead = async () => {
    if (!currentUserId) return;
    try {
      // 💡 Optimistic UI adjustment: drop clear indicator to 0 instantly
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch (err) {
      console.error("Error executing patch action logic markAllRead:", err);
      fetchData(); // Sync fallback update if server requests drop out
    }
  };

  const markRead = async (notificationId: string, actionUrl: string | null) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      
      if (actionUrl) router.push(actionUrl);
    } catch (err) {
      console.error("Error executing marker adjustment execution trace:", err);
      fetchData();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardShell 
      role={profile?.role} 
      unreadNotificationCount={unreadCount}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex items-center justify-between border-b border-[#3A3A52] pb-4">
          <div className="flex items-center gap-3">
            <Bell className="text-[#C9A84C]" size={24} />
            <h1 className="text-xl font-semibold text-[#F5F3ED]">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-[#C9A84C20] text-[#C9A84C] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#C9A84C40]">
                {unreadCount} new
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-xs font-medium text-[#A8A6B8] hover:text-[#C9A84C] transition bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Content Body Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#A8A6B8]">
            <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
            <p className="text-sm">Synchronizing dashboard activity feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#3A3A52] rounded-xl bg-[#11111F]">
            <Bell className="mx-auto text-[#5C5A70] mb-3" size={36} />
            <p className="text-[#F5F3ED] font-medium text-sm">All quiet here</p>
            <p className="text-xs text-[#5C5A70] mt-1">We will notify you when something important occurs.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
              const IconComp = cfg.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id, notif.action_url)}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition text-left cursor-pointer ${
                    notif.is_read
                      ? "bg-[#11111F]/40 border-[#222235] opacity-75 hover:bg-[#11111F]"
                      : "bg-[#161629] border-[#3A3A52] hover:border-[#C9A84C50]"
                  }`}
                >
                  {/* Categorized Visual Badge Icon container */}
                  <div className={`p-2.5 rounded-lg shrink-0 ${cfg.bg} ${cfg.color}`}>
                    <IconComp size={18} />
                  </div>

                  {/* Message Copy */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-sm font-medium truncate ${notif.is_read ? "text-[#A8A6B8]" : "text-[#F5F3ED]"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-[#5C5A70] whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#A8A6B8] line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  {/* Unread dot layout node indicator */}
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-[#C9A84C] mt-2 shrink-0 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}