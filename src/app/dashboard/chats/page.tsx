"use client";

import { Suspense } from "react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Send, Paperclip, Mic, Video,
  Calendar, FileText, CheckCircle, Globe,
  Loader2, MessageCircle, Phone, X, Square,
  Play, Pause, File as FileIcon, Users, Handshake,
  ShieldCheck, AlertTriangle, TrendingUp,
  Clock, ChevronDown, Info, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useSubscription } from "@/hooks/useSubscription";

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_tier: string;
  trust_score: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
  delivery_status?: string;
  is_read?: boolean;
  profiles: Profile;
};

type Conversation = {
  id: string;
  otherUser: Profile;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
  dealStage?: string | null;
  projectName?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

const DEAL_STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nda: { label: "NDA Stage", color: "text-blue-400", bg: "bg-blue-900/20" },
  term_sheet: { label: "Term Sheet", color: "text-purple-400", bg: "bg-purple-900/20" },
  agreement: { label: "Agreement", color: "text-[#C9A84C]", bg: "bg-[#C9A84C10]" },
  closed: { label: "Deal Closed", color: "text-emerald-400", bg: "bg-emerald-900/20" },
};

const TIER_COLORS: Record<string, string> = {
  premium: "text-[#C9A84C]",
  pro: "text-blue-400",
  free: "text-[#5C5A70]",
};

// ─── Main Component ───────────────────────────────────────────────────────────

function ChatsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { features } = useSubscription();

  const {
    recording, audioBlob, duration,
    startRecording, stopRecording, cancelRecording, resetAudio,
  } = useVoiceRecorder();

  // Auth
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string } | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get("conversationId") || null
  );

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Moderation
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // Upgrade
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  // Modals
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDealInfo, setShowDealInfo] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: "", agenda: "", date: "", time: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Mobile
  const [mobileView, setMobileView] = useState<"list" | "chat">(
    searchParams.get("conversationId") ? "chat" : "list"
  );

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);
  const dealStageInfo = activeConvo?.dealStage
    ? DEAL_STAGE_CONFIG[activeConvo.dealStage]
    : null;

  // Clean Conversation Switching Helper
  const selectConversation = (targetId: string) => {
    if (activeConversationId === targetId) return;

    // Save draft for previous conversation
    if (activeConversationId) {
      setDrafts((prev) => ({
        ...prev,
        [activeConversationId]: input,
      }));
    }

    // Switch active conversation and view
    setActiveConversationId(targetId);
    setMobileView("chat");

    // Load draft for target conversation or start completely fresh
    setInput(drafts[targetId] || "");

    // Clear previous banners, moderation warnings, and upgrade modals
    setUpgradePrompt(null);
    setModerationWarning(null);
    setBlockedMessage(null);
    setPendingContent(null);
    cancelRecording();
    resetAudio();
  };

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConversationId && currentUser) {
      markRead();
      setConversations((prev) =>
        prev.map((c) => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)
      );
    }
  }, [activeConversationId, currentUser]);

  // ─── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`msgs:${activeConversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("messages")
          .select(`*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, trust_score)`)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data]);
          if (data.sender_id !== currentUser?.id) markRead();
          setConversations((prev) =>
            prev.map((c) => c.id === activeConversationId
              ? { ...c, lastMessage: data.content, lastMessageTime: data.created_at }
              : c)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, currentUser, supabase]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      setCurrentUser(profile);
      fetchConversations(profile.id);
    }
  };

  const fetchConversations = async (userId: string) => {
    setLoadingConvos(true);
    const res = await fetch(`/api/conversations?userId=${userId}`);
    const { conversations: data } = await res.json();
    setConversations(data || []);
    setLoadingConvos(false);
  };

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/messages?conversationId=${conversationId}`);
    const { messages: data } = await res.json();
    setMessages(data || []);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (activeConversationId) fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  const markRead = async () => {
    if (!activeConversationId || !currentUser) return;
    await fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId, userId: currentUser.id }),
    });
  };

  // ─── Moderation ───────────────────────────────────────────────────────────

  const moderateContent = async (content: string): Promise<boolean> => {
    const res = await fetch("/api/messages/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();

    if (data.flagged && !data.warningOnly) {
      setBlockedMessage(data.reason);
      return false; // block send
    }

    if (data.flagged && data.warningOnly) {
      setModerationWarning(data.reason);
      setPendingContent(content);
      return false; // pause, ask user to confirm
    }

    return true; // allow
  };

  const sendAfterWarning = async () => {
    if (!pendingContent) return;
    setModerationWarning(null);
    await doSend(pendingContent);
    setPendingContent(null);
  };

  // ─── Send message ─────────────────────────────────────────────────────────

  const doSend = async (content: string) => {
    if (!activeConversationId || !currentUser) return;
    setSending(true);

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        senderId: currentUser.id,
        content,
        messageType: "text",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.upgradeRequired) {
        setUpgradePrompt(data.error);
        setInput(content);
      }
      if (data.moderated) {
        setBlockedMessage(data.error);
      }
    }

    setSending(false);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");

    const allowed = await moderateContent(content);
    if (!allowed) return;

    await doSend(content);
  };

  // ─── File upload ──────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !currentUser) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeConversationId);
    formData.append("senderId", currentUser.id);
    await fetch("/api/messages/upload", { method: "POST", body: formData });
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Voice note ───────────────────────────────────────────────────────────

  const sendVoiceNote = async () => {
    if (!audioBlob || !activeConversationId || !currentUser) return;
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeConversationId);
    formData.append("senderId", currentUser.id);
    await fetch("/api/messages/upload", { method: "POST", body: formData });
    resetAudio();
  };

  // ─── NDA ──────────────────────────────────────────────────────────────────

  const handleNDA = async () => {
    if (!activeConversationId || !currentUser) return;
    await fetch("/api/messages/nda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        senderId: currentUser.id,
        senderName: currentUser.full_name,
        recipientName: activeConvo?.otherUser?.full_name,
      }),
    });
  };

  // ─── Meeting ──────────────────────────────────────────────────────────────

  const handleScheduleMeeting = async () => {
    if (!meetingForm.title || !meetingForm.date || !meetingForm.time) return;
    const scheduledAt = new Date(`${meetingForm.date}T${meetingForm.time}`).toISOString();
    await fetch("/api/meetings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        organizerId: currentUser?.id,
        participantId: activeConvo?.otherUser?.id,
        title: meetingForm.title,
        agenda: meetingForm.agenda,
        scheduledAt,
        timezone: meetingForm.timezone,
      }),
    });
    setShowMeetingModal(false);
    setMeetingForm({ title: "", agenda: "", date: "", time: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  };

  // ─── Call ─────────────────────────────────────────────────────────────────

  const startCall = async (videoEnabled: boolean) => {
    if (!activeConversationId) return;
    const res = await fetch("/api/calls/create-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId }),
    });
    const { url } = await res.json();
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        senderId: currentUser?.id,
        content: `📞 ${videoEnabled ? "Video" : "Voice"} call started — Join: ${url}`,
        messageType: "system",
      }),
    });
    setCallUrl(url);
    setInCall(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#0A0A0F] flex flex-col overflow-hidden">

      {/* CALL OVERLAY */}
      {inCall && callUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0F] border-b border-[#1A1A2E]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#F0EEE8] text-sm font-medium">
                Live call — {activeConvo?.otherUser?.full_name}
              </span>
            </div>
            <button
              onClick={() => { setInCall(false); setCallUrl(null); }}
              className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
            >
              <Phone size={13} /> End call
            </button>
          </div>
          <iframe
            src={callUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            className="flex-1 w-full border-none"
          />
        </div>
      )}

      {/* TOP BAR */}
      <header className="bg-[#0A0A0F] border-b border-[#1A1A2E] px-4 py-3 flex items-center gap-3 shrink-0 z-20">
        <button onClick={() => router.back()}>
          <ArrowLeft size={18} className="text-[#6B6A7A]" />
        </button>
        <div className="w-7 h-7 rounded bg-gradient-to-br from-[#C9A84C] to-[#8B6B1A] flex items-center justify-center shrink-0">
          <span className="text-[#0A0A0F] text-xs font-bold">iV</span>
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-medium text-[#F0EEE8] leading-none">
            Deal room
          </h1>
          <p className="text-[#6B6A7A] text-xs mt-0.5">
            Secure · Monitored · Compliant
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">Protected</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* CONVERSATION LIST */}
        <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-72 border-r border-[#1A1A2E] shrink-0 overflow-hidden bg-[#0D0D16]`}>

          {/* List header */}
          <div className="px-4 py-3 border-b border-[#1A1A2E]">
            <div className="text-[#F0EEE8] text-sm font-medium">Conversations</div>
            <div className="text-[#6B6A7A] text-xs mt-0.5">
              {conversations.length} active
            </div>
          </div>

          {/* Community shortcut */}
          <button
            onClick={() => router.push("/dashboard/community")}
            className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A2E] hover:bg-[#1A1A2E] transition text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C15] border border-[#C9A84C25] flex items-center justify-center shrink-0">
              <Users size={16} className="text-[#C9A84C]" />
            </div>
            <div>
              <div className="text-[#F0EEE8] text-xs font-medium">REACH Community</div>
              <div className="text-[#6B6A7A] text-xs">Global deal discussions</div>
            </div>
          </button>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 gap-2">
                <MessageCircle size={24} className="text-[#1A1A2E]" />
                <p className="text-[#6B6A7A] text-xs text-center">
                  No conversations yet. Start by messaging a founder or investor from their profile.
                </p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#1A1A2E] text-left transition w-full ${
                    activeConversationId === c.id
                      ? "bg-[#C9A84C08] border-l-2 border-l-[#C9A84C]"
                      : "hover:bg-[#1A1A2E]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0 relative">
                    {c.otherUser?.avatar_url ? (
                      <img src={c.otherUser.avatar_url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      getInitials(c.otherUser?.full_name || "?")
                    )}
                    {c.otherUser?.is_verified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0D0D16] flex items-center justify-center">
                        <CheckCircle size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#F0EEE8] text-xs font-medium truncate">
                          {c.otherUser?.full_name}
                        </span>
                        {c.otherUser?.subscription_tier && c.otherUser.subscription_tier !== "free" && (
                          <span className={`text-xs ${TIER_COLORS[c.otherUser.subscription_tier]}`}>
                            ●
                          </span>
                        )}
                      </div>
                      {c.lastMessageTime && (
                        <span className="text-[#3A3A52] text-xs shrink-0">
                          {timeAgo(c.lastMessageTime)}
                        </span>
                      )}
                    </div>

                    {/* Deal stage indicator */}
                    {c.dealStage && DEAL_STAGE_CONFIG[c.dealStage] && (
                      <div className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded mb-0.5 ${DEAL_STAGE_CONFIG[c.dealStage].bg}`}>
                        <Handshake size={9} className={DEAL_STAGE_CONFIG[c.dealStage].color} />
                        <span className={`text-xs ${DEAL_STAGE_CONFIG[c.dealStage].color}`}>
                          {DEAL_STAGE_CONFIG[c.dealStage].label}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[#6B6A7A] text-xs truncate max-w-[140px]">
                        {c.lastMessage || "Start the conversation"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="w-4 h-4 bg-[#C9A84C] rounded-full text-[#0A0A0F] text-xs flex items-center justify-center font-medium shrink-0 ml-1">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>

          {activeConvo ? (
            <>
              {/* CHAT HEADER */}
              <div className="bg-[#0D0D16] border-b border-[#1A1A2E] flex items-center justify-between px-4 py-3 shrink-0">

                {/* Main header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button className="md:hidden" onClick={() => setMobileView("list")}>
                    <ArrowLeft size={16} className="text-[#6B6A7A]" />
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center text-xs font-medium text-[#C9A84C] flex-shrink-0 relative overflow-hidden">
                    {activeConvo.otherUser?.avatar_url ? (
                      <img src={activeConvo.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(activeConvo.otherUser?.full_name || "?")
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#F0EEE8] text-sm font-medium truncate">
                        {activeConvo.otherUser?.full_name}
                      </span>
                      {activeConvo.otherUser?.is_verified && (
                        <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                      )}
                      {activeConvo.otherUser?.subscription_tier !== "free" && (
                        <span className={`text-xs font-medium ${TIER_COLORS[activeConvo.otherUser?.subscription_tier || "free"]}`}>
                          {activeConvo.otherUser?.subscription_tier?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeConvo.otherUser?.trust_score > 0 && (
                        <span className="text-[#6B6A7A] text-xs">
                          ⭐ {activeConvo.otherUser.trust_score.toFixed(1)} trust
                        </span>
                      )}
                      <Globe size={9} className="text-[#3A3A52]" />
                      <span className="text-[#3A3A52] text-xs">Monitored</span>
                    </div>
                  </div>

                  {/* Call buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startCall(false)}
                      className="w-8 h-8 flex items-center justify-center border border-[#2A2A3E] rounded-lg hover:bg-[#1A1A2E] transition"
                      title="Voice call"
                    >
                      <Phone size={14} className="text-[#6B6A7A]" />
                    </button>
                    <button
                      onClick={() => startCall(true)}
                      className="w-8 h-8 flex items-center justify-center border border-[#2A2A3E] rounded-lg hover:bg-[#1A1A2E] transition"
                      title="Video call"
                    >
                      <Video size={14} className="text-[#6B6A7A]" />
                    </button>
                    <button
                      onClick={() => setShowDealInfo(!showDealInfo)}
                      className="w-8 h-8 flex items-center justify-center border border-[#2A2A3E] rounded-lg hover:bg-[#1A1A2E] transition"
                      title="Deal info"
                    >
                      <Info size={14} className="text-[#6B6A7A]" />
                    </button>
                  </div>
                </div>

                {/* Deal stage bar */}
                {dealStageInfo && (
                  <div className={`flex items-center justify-between px-4 py-2 border-t border-[#1A1A2E] ${dealStageInfo.bg}`}>
                    <div className="flex items-center gap-2">
                      <Handshake size={13} className={dealStageInfo.color} />
                      <span className={`text-xs font-medium ${dealStageInfo.color}`}>
                        {dealStageInfo.label}
                      </span>
                      {activeConvo.projectName && (
                        <span className="text-[#6B6A7A] text-xs">· {activeConvo.projectName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/deals")}
                      className={`text-xs ${dealStageInfo.color} hover:underline flex items-center gap-1`}
                    >
                      View pipeline <TrendingUp size={10} />
                    </button>
                  </div>
                )}

                {/* Policy banner */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-t border-[#1A1A2E] bg-[#0A0A0F]">
                  <ShieldCheck size={11} className="text-[#3A3A52] flex-shrink-0" />
                  <span className="text-[#3A3A52] text-xs">
                    All messages are monitored for compliance. Do not share personal contact details.
                  </span>
                </div>
              </div>

              {/* DEAL INFO PANEL */}
              {showDealInfo && (
                <div className="bg-[#0D0D16] border-b border-[#1A1A2E] px-4 py-3 flex-shrink-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                      <ShieldCheck size={14} className="text-emerald-400 mx-auto mb-1" />
                      <div className="text-emerald-400 text-xs font-medium">NDA</div>
                      <div className="text-[#6B6A7A] text-xs">Requested</div>
                    </div>
                    <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                      <Handshake size={14} className="text-[#C9A84C] mx-auto mb-1" />
                      <div className={`text-xs font-medium ${dealStageInfo?.color || "text-[#6B6A7A]"}`}>
                        {dealStageInfo?.label || "No active deal"}
                      </div>
                      <div className="text-[#6B6A7A] text-xs">Stage</div>
                    </div>
                    <div className="bg-[#0A0A0F] border border-[#1A1A2E] rounded-lg p-2.5 text-center">
                      <TrendingUp size={14} className="text-[#C9A84C] mx-auto mb-1" />
                      <div className="text-[#C9A84C] text-xs font-medium">{activeConvo.otherUser?.trust_score?.toFixed(1) || "—"}</div>
                      <div className="text-[#6B6A7A] text-xs">Trust score</div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/deals")}
                    className="w-full mt-3 flex items-center justify-center gap-2 border border-[#C9A84C30] text-[#C9A84C] text-xs py-2 rounded-lg hover:bg-[#C9A84C08] transition"
                  >
                    <Handshake size={13} />
                    Open deal pipeline
                  </button>
                </div>
              )}

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-[#0A0A0F]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="text-[#C9A84C] animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center">
                      <Handshake size={20} className="text-[#C9A84C]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[#F0EEE8] text-sm font-medium mb-1">Deal room opened</p>
                      <p className="text-[#6B6A7A] text-xs max-w-xs leading-relaxed">
                        This is a secure, monitored deal room. Introduce yourself professionally and state your interest.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full max-w-xs">
                      {[
                        "I've reviewed your project and I'm interested in learning more.",
                        "Could you share more details about your traction?",
                        "I'd like to request an NDA before we proceed.",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setInput(suggestion)}
                          className="text-xs text-left px-3 py-2 bg-[#1A1A2E] border border-[#2A2A3E] rounded-lg text-[#9998A8] hover:border-[#C9A84C30] hover:text-[#F0EEE8] transition"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const isSystem = msg.message_type === "system";
                    const isFile = msg.message_type === "file";
                    const isVoice = msg.file_name?.endsWith(".webm");
                    const isImage = isFile && isImageFile(msg.file_name || "");

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1">
                          <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-4 py-2.5 max-w-sm text-xs text-[#9998A8] text-center leading-relaxed">
                            <ShieldCheck size={12} className="text-[#C9A84C] inline mr-1" />
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="text-[#6B6A7A] text-xs mb-1 ml-1">
                            {msg.profiles?.full_name}
                          </span>
                        )}

                        {isImage ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.file_url} alt={msg.file_name}
                              className="max-w-xs rounded-xl border border-[#2A2A3E] hover:opacity-90 transition" />
                          </a>
                        ) : isVoice ? (
                          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl max-w-xs ${
                            isMe
                              ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E]"
                              : "bg-[#1A1A2E] border border-[#2A2A3E]"
                          }`}>
                            <button
                              onClick={() => {
                                if (playingAudio === msg.id) {
                                  audioRef.current?.pause();
                                  setPlayingAudio(null);
                                } else {
                                  if (audioRef.current) {
                                    audioRef.current.src = msg.file_url || "";
                                    audioRef.current.play();
                                    setPlayingAudio(msg.id);
                                    audioRef.current.onended = () => setPlayingAudio(null);
                                  }
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? "bg-[#00000020]" : "bg-[#C9A84C15]"}`}
                            >
                              {playingAudio === msg.id
                                ? <Pause size={14} className={isMe ? "text-[#0A0A0F]" : "text-[#C9A84C]"} />
                                : <Play size={14} className={isMe ? "text-[#0A0A0F]" : "text-[#C9A84C]"} />
                              }
                            </button>
                            <div className="flex-1">
                              <div className={`text-xs font-medium ${isMe ? "text-[#0A0A0F]" : "text-[#F0EEE8]"}`}>
                                Voice note
                              </div>
                              <div className={`h-0.5 rounded mt-1 ${isMe ? "bg-[#00000015]" : "bg-[#C9A84C20]"}`} />
                            </div>
                          </div>
                        ) : isFile ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl max-w-xs border ${
                              isMe
                                ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E] border-transparent"
                                : "bg-[#1A1A2E] border-[#2A2A3E]"
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? "bg-[#00000015]" : "bg-[#C9A84C15]"}`}>
                              <FileIcon size={14} className={isMe ? "text-[#0A0A0F]" : "text-[#C9A84C]"} />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-medium truncate ${isMe ? "text-[#0A0A0F]" : "text-[#F0EEE8]"}`}>
                                {msg.file_name || msg.content}
                              </div>
                              <div className={`text-xs ${isMe ? "text-[#00000050]" : "text-[#6B6A7A]"}`}>
                                Tap to download
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className={`max-w-xs md:max-w-sm px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-gradient-to-br from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] font-medium"
                              : "bg-[#1A1A2E] border border-[#2A2A3E] text-[#F0EEE8]"
                          }`}>
                            {msg.content}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[#3A3A52] text-xs">{formatTime(msg.created_at)}</span>
                          {isMe && (
                            <span className={`text-xs ${(msg.delivery_status === "read" || msg.is_read) ? "text-[#C9A84C]" : "text-[#3A3A52]"}`}>
                              {(msg.delivery_status === "read" || msg.is_read) ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
                <audio ref={audioRef} className="hidden" />
              </div>

              {/* MODERATION ALERTS */}

              {/* Hard block */}
              {blockedMessage && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-900/20 border-t border-red-900/30 flex-shrink-0">
                  <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 text-xs font-medium mb-0.5">Message blocked</p>
                    <p className="text-red-300 text-xs leading-relaxed">{blockedMessage}</p>
                  </div>
                  <button onClick={() => setBlockedMessage(null)}>
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
              )}

              {/* Warning + confirm */}
              {moderationWarning && (
                <div className="flex items-start gap-3 px-4 py-3 bg-yellow-900/20 border-t border-yellow-900/30 flex-shrink-0">
                  <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 text-xs font-medium mb-0.5">Platform policy reminder</p>
                    <p className="text-yellow-300 text-xs leading-relaxed mb-2">{moderationWarning}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={sendAfterWarning}
                        className="text-xs px-3 py-1 bg-yellow-900/30 border border-yellow-800 text-yellow-400 rounded-lg"
                      >
                        Send anyway
                      </button>
                      <button
                        onClick={() => { setModerationWarning(null); setPendingContent(null); }}
                        className="text-xs px-3 py-1 bg-[#1A1A2E] border border-[#2A2A3E] text-[#9998A8] rounded-lg"
                      >
                        Edit message
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upgrade prompt */}
              {upgradePrompt && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#C9A84C08] border-t border-[#C9A84C20] flex-shrink-0">
                  <Zap size={15} className="text-[#C9A84C] flex-shrink-0" />
                  <p className="text-[#C9A84C] text-xs flex-1">{upgradePrompt}</p>
                  <button
                    onClick={() => router.push("/dashboard/upgrade")}
                    className="text-xs font-medium bg-[#C9A84C] text-[#0A0A0F] px-3 py-1.5 rounded-lg flex-shrink-0"
                  >
                    Upgrade
                  </button>
                  <button onClick={() => setUpgradePrompt(null)}>
                    <X size={14} className="text-[#6B6A7A]" />
                  </button>
                </div>
              )}

              {/* VOICE RECORDING */}
              {recording && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[#1A1A2E] bg-red-900/10 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs flex-1">
                    Recording… {formatDuration(duration)}
                  </span>
                  <button onClick={cancelRecording} className="text-[#6B6A7A] hover:text-[#9998A8]">
                    <X size={16} />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <Square size={12} className="text-white fill-white" />
                  </button>
                </div>
              )}

              {/* VOICE NOTE PREVIEW */}
              {audioBlob && !recording && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[#1A1A2E] bg-[#0D0D16] flex-shrink-0">
                  <Mic size={14} className="text-[#C9A84C]" />
                  <span className="text-[#9998A8] text-xs flex-1">
                    Voice note ready — {formatDuration(duration)}
                  </span>
                  <button onClick={cancelRecording} className="text-[#6B6A7A] hover:text-[#9998A8] mr-1">
                    <X size={14} />
                  </button>
                  <button
                    onClick={sendVoiceNote}
                    className="text-xs font-medium bg-[#C9A84C] text-[#0A0A0F] px-4 py-1.5 rounded-lg"
                  >
                    Send
                  </button>
                </div>
              )}

              {/* BOTTOM BAR */}
              {!recording && !audioBlob && (
                <>
                  {/* Action row */}
                  <div className="flex items-center gap-2 px-4 py-2 border-t border-[#1A1A2E] bg-[#0D0D16] overflow-x-auto flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                    >
                      {uploadingFile ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                      {uploadingFile ? "Uploading…" : "Document"}
                    </button>
                    <button
                      onClick={handleNDA}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                    >
                      <ShieldCheck size={11} />
                      Request NDA
                    </button>
                    {features.canScheduleMeetings ? (
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6B6A7A] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] hover:text-[#9998A8] transition"
                      >
                        <Calendar size={11} />
                        Schedule meeting
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#3A3A52] border border-[#1A1A2E] px-2.5 py-1.5 rounded-lg hover:bg-[#1A1A2E] transition"
                      >
                        <Calendar size={11} />
                        Meeting
                        <Zap size={9} className="text-[#C9A84C]" />
                      </button>
                    )}
                    <button
                      onClick={() => router.push("/dashboard/deals")}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#C9A84C] border border-[#C9A84C25] px-2.5 py-1.5 rounded-lg hover:bg-[#C9A84C08] transition"
                    >
                      <Handshake size={11} />
                      Deal pipeline
                    </button>
                  </div>

                  {/* Message input row */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-[#1A1A2E] bg-[#0D0D16] flex-shrink-0">
                    <div className="flex-1 flex items-center gap-2 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl px-3 py-2.5 focus-within:border-[#C9A84C30] transition">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          if (blockedMessage) setBlockedMessage(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a professional message…"
                        className="flex-1 bg-transparent text-[#F0EEE8] text-sm outline-none placeholder-[#3A3A52]"
                      />
                    </div>

                    {input.trim() ? (
                      <button
                        onClick={sendMessage}
                        disabled={sending}
                        className="w-10 h-10 bg-gradient-to-br from-[#C9A84C] to-[#A8882E] rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-90 transition shadow-lg"
                        style={{ boxShadow: "0 4px 16px rgba(201,168,76,0.3)" }}
                      >
                        {sending
                          ? <Loader2 size={15} className="text-[#0A0A0F] animate-spin" />
                          : <Send size={15} className="text-[#0A0A0F]" />
                        }
                      </button>
                    ) : features.canMessageFirst ? (
                      <button
                        onMouseDown={startRecording}
                        className="w-10 h-10 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl flex items-center justify-center flex-shrink-0 hover:border-[#C9A84C30] transition"
                        title="Hold to record voice note"
                      >
                        <Mic size={15} className="text-[#6B6A7A]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/dashboard/upgrade")}
                        className="w-10 h-10 bg-[#0A0A0F] border border-[#1A1A2E] rounded-xl flex items-center justify-center flex-shrink-0 hover:border-[#C9A84C30] transition"
                        title="Upgrade for voice notes"
                      >
                        <Mic size={15} className="text-[#2A2A3E]" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            // Empty state
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0A0A0F]">
              <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E] border border-[#2A2A3E] flex items-center justify-center">
                <Handshake size={28} className="text-[#C9A84C]" />
              </div>
              <div className="text-center">
                <p className="text-[#F0EEE8] text-sm font-medium mb-1">Select a deal room</p>
                <p className="text-[#6B6A7A] text-xs max-w-xs leading-relaxed">
                  Choose a conversation from the left to open a secure deal room
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MEETING MODAL */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-[#0D0D16] border border-[#2A2A3E] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#F0EEE8] text-base font-medium">Schedule meeting</h3>
                <p className="text-[#6B6A7A] text-xs mt-0.5">with {activeConvo?.otherUser?.full_name}</p>
              </div>
              <button onClick={() => setShowMeetingModal(false)}>
                <X size={16} className="text-[#6B6A7A]" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="Meeting title *"
                className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition placeholder-[#3A3A52]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition"
                />
                <input
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                  className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition"
                />
              </div>
              <textarea
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                rows={2}
                placeholder="Agenda (optional)"
                className="w-full bg-[#0A0A0F] border border-[#1A1A2E] text-[#F0EEE8] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C30] transition placeholder-[#3A3A52] resize-none"
              />
              <button
                onClick={handleScheduleMeeting}
                disabled={!meetingForm.title || !meetingForm.date || !meetingForm.time}
                className={`w-full font-medium text-sm py-3 rounded-xl transition ${
                  meetingForm.title && meetingForm.date && meetingForm.time
                    ? "bg-gradient-to-r from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] hover:opacity-90"
                    : "bg-[#1A1A2E] text-[#3A3A52] cursor-not-allowed"
                }`}
              >
                Schedule meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
      </div>
    }>
      <ChatsInner />
    </Suspense>
  );
}