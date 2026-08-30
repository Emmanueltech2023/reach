"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Bell, MessageCircle, Calendar, TrendingUp,
  ShieldCheck, Star, Info, Loader2, CheckCheck, Briefcase,
  Trash2, X, ExternalLink, Sparkles
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
  label: string;
}> = {
  message: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-900/30", label: "Direct Message" },
  meeting: { icon: Calendar, color: "text-purple-400", bg: "bg-purple-900/30", label: "Meeting Schedule" },
  deal: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-900/30", label: "Investment Deal" },
  kyc: { icon: ShieldCheck, color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Identity Verification" },
  match: { icon: Star, color: "text-[#C9A84C]", bg: "bg-[#C9A84C20]", label: "AI Match Alert" },
  interest: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-900/30", label: "Investor Interest" },
  job_application: { icon: Briefcase, color: "text-[#C9A84C]", bg: "bg-[#C9A84C20]", label: "Career Application" },
  general: { icon: Info, color: "text-[#A8A6B8]", bg: "bg-[#1A1A2E]", label: "System Announcement" },
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
  
  // Selected Notification for Full Reader Lightbox Modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("Auth error in notifications:", authError);
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username, role")
        .eq("id", user.id)
        .single();
        
      if (prof) setProfile(prof);

      const targetUrl = `/api/notifications?userId=${user.id}`;
      const res = await fetch(targetUrl);
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      const platformNotifs = Array.isArray(data) ? data.filter((n: Notification) => n.type !== "message") : [];
      setNotifications(platformNotifs);
      
    } catch (error) {
      console.error("Notifications fetch error:", error);
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
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch (err) {
      console.error("Error marking all read:", err);
      fetchData();
    }
  };

  const openNotificationDetail = async (notif: Notification) => {
    setSelectedNotification(notif);

    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );

      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notif.id }),
        });
      } catch (err) {
        console.error("Error marking notification read:", err);
      }
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
      }
      await fetch(`/api/notifications?notificationId=${notificationId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error deleting notification:", err);
      fetchData();
    }
  };

  const clearReadNotifications = async () => {
    if (!currentUserId) return;
    try {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      await fetch(`/api/notifications?userId=${currentUserId}&onlyRead=true`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error clearing read notifications:", err);
      fetchData();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  return (
    <DashboardShell 
      role={profile?.role} 
      unreadNotificationCount={unreadCount}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#3A3A52] pb-4 gap-3">
          <div className="flex items-center gap-3">
            <Bell className="text-[#C9A84C]" size={24} />
            <h1 className="text-xl font-semibold text-[#F5F3ED]">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-[#C9A84C20] text-[#C9A84C] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#C9A84C40]">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-medium text-[#A8A6B8] hover:text-[#C9A84C] transition bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}

            {readCount > 0 && (
              <button
                onClick={clearReadNotifications}
                className="flex items-center gap-1.5 text-xs font-medium text-[#A8A6B8] hover:text-red-400 transition bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg cursor-pointer"
              >
                <Trash2 size={13} />
                Clear read ({readCount})
              </button>
            )}
          </div>
        </div>

        {/* Content Body Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#A8A6B8]">
            <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
            <p className="text-sm">Synchronizing activity feed...</p>
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
                  onClick={() => openNotificationDetail(notif)}
                  className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition text-left cursor-pointer ${
                    notif.is_read
                      ? "bg-[#11111F]/40 border-[#222235] opacity-80 hover:bg-[#11111F] hover:border-[#3A3A52]"
                      : "bg-[#161629] border-[#3A3A52] hover:border-[#C9A84C50] shadow-md shadow-[#C9A84C]/5"
                  }`}
                >
                  {/* Categorized Visual Badge Icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${cfg.bg} ${cfg.color}`}>
                    <IconComp size={18} />
                  </div>

                  {/* Message Copy */}
                  <div className="flex-1 min-w-0 space-y-1 pr-8">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-sm font-semibold truncate ${notif.is_read ? "text-[#A8A6B8]" : "text-[#F5F3ED]"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-[#5C5A70] whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#A8A6B8] line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.body.length > 90 && (
                      <span className="text-[10px] text-[#C9A84C] font-semibold inline-flex items-center gap-1 mt-1 hover:underline">
                        <span>Read full message</span> →
                      </span>
                    )}
                  </div>

                  {/* Right side indicators & Delete action */}
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {!notif.is_read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C9A84C] animate-pulse" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#5C5A70] hover:text-red-400 hover:bg-[#2A2A3E] transition duration-150 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 Interactive Full Notification Reader Lightbox Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#C9A84C]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Ambient Background Glow */}
            <div className="absolute w-60 h-60 bg-[#C9A84C]/10 rounded-full blur-3xl pointer-events-none -top-10 -right-10" />

            {/* Modal Header */}
            <div className="p-5 border-b border-[#3A3A52] flex items-center justify-between relative z-10 bg-[#0F0F1A]/50">
              <div className="flex items-center gap-3">
                {(() => {
                  const cfg = TYPE_CONFIG[selectedNotification.type] || TYPE_CONFIG.general;
                  const IconComp = cfg.icon;
                  return (
                    <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.color}`}>
                      <IconComp size={20} />
                    </div>
                  );
                })()}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                    {(TYPE_CONFIG[selectedNotification.type] || TYPE_CONFIG.general).label}
                  </span>
                  <div className="text-[11px] text-[#A8A6B8]">
                    {new Date(selectedNotification.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] hover:border-[#C9A84C] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 relative z-10">
              <h2 className="text-lg font-bold text-[#F5F3ED] leading-snug">
                {selectedNotification.title}
              </h2>

              <div className="bg-[#0F0F1A]/80 border border-[#3A3A52]/60 rounded-2xl p-4 text-xs text-[#A8A6B8] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                {selectedNotification.body}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-[#3A3A52] bg-[#0F0F1A]/50 flex items-center justify-end gap-3 relative z-10">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2.5 rounded-xl border border-[#3A3A52] text-xs font-semibold text-[#A8A6B8] hover:text-[#F5F3ED] hover:bg-[#1A1A2E] transition cursor-pointer"
              >
                Close
              </button>

              {selectedNotification.action_url && (
                <button
                  onClick={() => {
                    const url = selectedNotification.action_url!;
                    setSelectedNotification(null);
                    router.push(url);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E6C665] text-[#0A0A0F] text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-[#C9A84C]/20 hover:opacity-95 transition cursor-pointer"
                >
                  <span>Open Page</span>
                  <ExternalLink size={14} />
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </DashboardShell>
  );
}