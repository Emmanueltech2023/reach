"use client";

import { Suspense, ChangeEvent, useEffect, useState, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  Video,
  Calendar,
  FileText,
  CheckCircle,
  Globe,
  Loader2,
  MessageCircle,
  Phone,
  X,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  File as LucideFile,
  Users,
  Search,
  Check,
  MoreVertical,
  Smile,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
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
  delivery_status: "sent" | "delivered" | "read";
  profiles: Profile;
};

type Conversation = {
  id: string;
  otherUser: Profile;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatWhatsAppTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

const AVATAR_COLORS = [
  "bg-[#1A1A2E] text-[#C9A84C] border border-[#3A3A52]",
  "bg-[#0F0F1A] text-[#C9A84C] border border-[#3A3A52]",
  "bg-[#252538] text-[#C9A84C] border border-[#C9A84C]/30",
];

function getColor(id: string) {
  return AVATAR_COLORS[id?.charCodeAt(0) % AVATAR_COLORS.length];
}

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp|jfif)$/i.test(name);
}

const POPULAR_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
  "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
  "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥",
  "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐",
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👹", "💀", "☠️", "👻",
  "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "👋", "🤚", "🖐️",
  "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
  "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪",
  "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
  "💋", "🩸", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕",
  "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🕉️", "🔥", "✨", "⭐", "🌟", "⚡", "💥", "🛑", "💵"
];

function ChatsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  
  const {
    recording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
  } = useVoiceRecorder();

  const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    searchParams.get("conversationId") || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  // Custom tracking state additions
  const [showSidebarDropdown, setShowSidebarDropdown] = useState(false);
  const [showChatHeaderDropdown, setShowChatHeaderDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [audioProgress, setAudioProgress] = useState<{ [msgId: string]: number }>({});
  const [audioDurations, setAudioDurations] = useState<{ [msgId: string]: number }>({});

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    agenda: "",
    date: "",
    time: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [mobileView, setMobileView] = useState<"list" | "chat">(
    searchParams.get("conversationId") ? "chat" : "list"
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      c.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Click outside to close standard overlay elements safely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Online Status Engine Implementation (Point 4)
  useEffect(() => {
    type PresenceEntry = { user_id: string } & Record<string, unknown>;
    type PresenceState = Record<string, PresenceEntry[]>;

    const channel = supabase.channel("online-presence-workspace", {
      config: { presence: { key: "user" } }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as PresenceState;
      const currentOnlineIds = Object.values(state)
        .flat()
        .map((p) => (p as PresenceEntry).user_id);
      setOnlineUsers(currentOnlineIds);
    });

    channel.on("presence", { event: "join" }, ({ newPresences }) => {
      const joinedIds = newPresences.map((p) => ((p as unknown) as PresenceEntry).user_id);
      setOnlineUsers((prev) => Array.from(new Set([...prev, ...joinedIds])));
    });

    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      const leftIds = leftPresences.map((p) => ((p as unknown) as PresenceEntry).user_id);
      setOnlineUsers((prev) => prev.filter((id) => !leftIds.includes(id)));
    });

    const triggerPresenceTracking = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });
    };

    void triggerPresenceTracking();

    return () => {
      void channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Handle HTML5 Audio accurate monitoring state loop (Point 3)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (playingAudio) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setAudioProgress((prev) => ({ ...prev, [playingAudio]: isNaN(pct) ? 0 : pct }));
      }
    };

    const handleLoadedMetadata = () => {
      if (playingAudio) {
        setAudioDurations((prev) => ({ ...prev, [playingAudio]: audio.duration }));
      }
    };

    const handleAudioEnded = () => {
      if (playingAudio) {
        setAudioProgress((prev) => ({ ...prev, [playingAudio]: 100 }));
        setPlayingAudio(null);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleAudioEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleAudioEnded);
    };
  }, [playingAudio]);

  const fetchConversations = useCallback(async (userId: string) => {
    setLoadingConvos(true);
    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      const { conversations: data } = await res.json();
      setConversations(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
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
    void loadUser();
  }, [supabase, fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    const markRead = async () => {
      if (!activeConversationId || !currentUser) return;
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          userId: currentUser.id,
        }),
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    };
    void markRead();
  }, [activeConversationId, currentUser]);

  useEffect(() => {
    if (!activeConversationId) return;
    
    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select(`*, profiles(id, full_name, username, avatar_url, is_verified)`)
            .eq("id", payload.new.id)
            .single();
            
          if (data) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });

            if (data.sender_id !== currentUser?.id) {
              fetch("/api/messages/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: activeConversationId, userId: currentUser?.id }),
              });
            }

            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversationId
                  ? { ...c, lastMessage: data.content, lastMessageTime: data.created_at }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [activeConversationId, currentUser, supabase]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversationId) return;
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages?conversationId=${activeConversationId}`);
        const { messages: data } = await res.json();
        setMessages(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMessages(false);
      }
    };
    void loadMessages();
  }, [activeConversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !activeConversationId || !currentUser || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversationId,
        senderId: currentUser.id,
        content,
        messageType: "text",
      }),
    });
    setSending(false);
  };

  // Close attachment window handler helper (Point 5)
  const triggerFileInputAction = (acceptType: string) => {
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("accept", acceptType);
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !currentUser) return;
    setShowAttachMenu(false);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeConversationId);
    formData.append("senderId", currentUser.id);
    
    await fetch("/api/messages/upload", { method: "POST", body: formData });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !activeConversationId || !currentUser) return;
    const formData = new FormData();
    formData.append("file", audioBlob, `voice-note-${Date.now()}.webm`);
    formData.append("conversationId", activeConversationId);
    formData.append("senderId", currentUser.id);
    
    await fetch("/api/messages/upload", { method: "POST", body: formData });
    resetAudio();
  };

  const handleNDA = async () => {
    if (!activeConversationId || !currentUser) return;

    // Create a deal record
    await fetch(`/api/conversations?userId=${currentUser.id}`);
    // Send NDA system message
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

  // Notify recipient
  await fetch("/api/notifications/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: activeConvo?.otherUser?.id,
      title: "NDA request received",
      body: `${currentUser.full_name} has requested you sign an NDA to proceed with deal discussions.`,
      type: "deal",
      actionUrl: "/dashboard/chats",
    }),
  });
};

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
        content: `📞 ${videoEnabled ? "Video" : "Voice"} call started\n\nJoin here: ${url}`,
        messageType: "system",
      }),
    });
    setCallUrl(url);
    setInCall(true);
  };

  const openConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setMobileView("chat");
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  const handleVoicePlayToggle = (msgId: string, fileUrl: string) => {
    if (playingAudio === msgId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else if (audioRef.current) {
      audioRef.current.src = fileUrl;
      void audioRef.current.play();
      setPlayingAudio(msgId);
    }
  };

  const isOtherUserOnline = activeConvo ? onlineUsers.includes(activeConvo.otherUser.id) : false;

  return (
    <div className="h-screen w-screen bg-[#0F0F1A] flex overflow-hidden font-sans text-[#F5F3ED]">
      {/* Active Call UI Layer */}
      {inCall && callUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-[#1A1A2E] border-b border-[#3A3A52]">
            <span className="text-[#F5F3ED] font-medium">{activeConvo?.otherUser?.full_name} — Live Deal Room</span>
            <button onClick={() => { setInCall(false); setCallUrl(null); }} className="bg-red-600 text-white text-sm px-4 py-2 rounded font-medium">End Session</button>
          </div>
          <iframe src={callUrl} allow="camera; microphone; fullscreen; speaker; display-capture" className="flex-1 w-full border-none" />
        </div>
      )}

      {/* WHATSAPP SIDEBAR: CHAT THREADS (BLACK & GOLD DESIGN) */}
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-100 border-r border-[#3A3A52] bg-[#0F0F1A] shrink-0 h-full`}>
        {/* Sidebar Header */}
        <div className="h-15 bg-[#1A1A2E] px-4 flex items-center justify-between shrink-0 border-b border-[#3A3A52]/50 relative z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="hover:bg-[#252538] p-1.5 rounded-full transition text-[#5C5A70] hover:text-[#C9A84C]">
              <ArrowLeft size={20} />
            </button>
            <div className="font-semibold text-base text-[#F5F3ED]">Chats</div>
          </div>
          <div className="flex items-center gap-4 text-[#5C5A70] relative">
            <button onClick={() => router.push("/dashboard/community")} title="Community Forums" className="hover:bg-[#252538] p-2 rounded-full transition hover:text-[#C9A84C]">
              <Users size={20} />
            </button>
            <button 
              onClick={() => setShowSidebarDropdown(!showSidebarDropdown)} 
              className="hover:bg-[#252538] p-2 rounded-full transition hover:text-[#C9A84C]"
            >
              <MoreVertical size={20} className="cursor-pointer" />
            </button>
            
            {/* Sidebar Settings Dropdown Window (Point 1 Fix) */}
            {showSidebarDropdown && (
              <div className="absolute top-11 right-0 bg-[#1A1A2E] rounded-lg border border-[#3A3A52] shadow-2xl py-1.5 w-44 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100">
                <button onClick={() => { setShowSidebarDropdown(false); router.push("/dashboard/settings"); }} className="w-full text-left px-4 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] transition">Settings</button>
                <button onClick={() => setShowSidebarDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] transition">Archived Chats</button>
                <div className="h-px bg-[#3A3A52] my-1" />
                <button onClick={() => setShowSidebarDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#0F0F1A] transition">Clear Logs</button>
              </div>
            )}
          </div>
        </div>

        {/* Search Input Section */}
        <div className="p-2 bg-[#0F0F1A] border-b border-[#3A3A52]/40 shrink-0">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-lg flex items-center px-3 py-1.5 gap-4 focus-within:border-[#C9A84C] transition">
            <Search size={16} className="text-[#5C5A70]" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-[#F5F3ED] placeholder-[#5C5A70] outline-none w-full"
            />
          </div>
        </div>

        {/* Thread List Feed */}
        <div className="flex-1 overflow-y-auto bg-[#0F0F1A] no-scrollbar">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-20 px-6 text-[#5C5A70] text-sm">No active discussions found.</div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activeConversationId === c.id;
              const isThreadUserOnline = onlineUsers.includes(c.otherUser?.id || "");
              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-[#3A3A52]/30 text-left w-full transition ${
                    isSelected ? "bg-[#1A1A2E] border-l-2 border-l-[#C9A84C]" : "hover:bg-[#1A1A2E]/50"
                  }`}
                >
                  <div className="relative shrink-0">
  {/* 💡 FIXED: Handles image layouts properly and safely renders avatar photos or fallback initials */}
  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden relative ${
    c.otherUser?.avatar_url ? "" : getColor(c.otherUser?.id || "a")
  }`}>
    {c.otherUser?.avatar_url ? (
      <Image
        src={c.otherUser.avatar_url}
        alt={c.otherUser?.full_name || "Profile"}
        fill
        className="object-cover"
        sizes="48px"
        unoptimized
      />
    ) : (
      <span>{getInitials(c.otherUser?.full_name || "?")}</span>
    )}
  </div>
                    {/* Live indicator dot on thread listing nodes (Point 4) */}
                    {isThreadUserOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0F0F1A] rounded-full shadow" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[#F5F3ED] text-base font-normal truncate">{c.otherUser?.full_name || "Deal Space"}</span>
                        {c.otherUser?.is_verified && <CheckCircle size={14} className="text-[#C9A84C] fill-[#C9A84C] shrink-0" />}
                      </div>
                      {c.lastMessageTime && <span className="text-[#5C5A70] text-xs shrink-0">{formatWhatsAppTime(c.lastMessageTime)}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[#5C5A70] text-sm truncate mr-2 flex-1">{c.lastMessage}</p>
                      {c.unreadCount > 0 && (
                        <span className="min-w-5 h-5 px-1 bg-[#C9A84C] rounded-full text-[#0F0F1A] text-xs font-bold flex items-center justify-center shrink-0">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* WHATSAPP CHAT PANEL SCREEN (BLACK & GOLD DESIGN) */}
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col h-full bg-[#0F0F1A] overflow-hidden`}>
        {activeConvo ? (
          <>
            {/* Window Top Navigation Frame */}
            <div className="h-15 bg-[#1A1A2E] px-4 flex items-center justify-between shrink-0 border-b border-[#3A3A52] relative z-20">
              <div className="flex items-center gap-3 min-w-0">
                <button className="md:hidden hover:bg-[#252538] p-1.5 rounded-full text-[#5C5A70] hover:text-[#C9A84C]" onClick={() => setMobileView("list")}>
                  <ArrowLeft size={20} />
                </button>
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs ${getColor(activeConvo.otherUser?.id || "a")}`}>
                    {getInitials(activeConvo.otherUser?.full_name || "?")}
                  </div>
                  {/* Dynamic Header Online State Tracking Visualizer (Point 4 Fix) */}
                  {isOtherUserOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#1A1A2E] rounded-full shadow" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#F5F3ED] font-medium text-base truncate">{activeConvo.otherUser?.full_name}</span>
                    {activeConvo.otherUser?.is_verified && <CheckCircle size={14} className="text-[#C9A84C] fill-[#C9A84C]" />}
                  </div>
                  <div className="flex items-center gap-1 text-[#5C5A70] text-xs">
                    <Globe size={12} className={isOtherUserOnline ? "text-green-400" : "text-[#C9A84C]"} />
                    <span>{isOtherUserOnline ? "Online" : "Real-time Secure Line"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 text-[#5C5A70] relative">
                <button onClick={() => startCall(false)} title="Voice Call" className="hover:text-[#C9A84C] transition"><Phone size={20} /></button>
                <button onClick={() => startCall(true)} title="Video Call" className="hover:text-[#C9A84C] transition"><Video size={20} /></button>
                <button 
                  onClick={() => setShowChatHeaderDropdown(!showChatHeaderDropdown)} 
                  className="hover:bg-[#252538] p-1.5 rounded-full transition hover:text-[#C9A84C]"
                >
                  <MoreVertical size={20} className="cursor-pointer" />
                </button>

                {/* Right Header Settings Dropdown Popover Window (Point 1 Fix) */}
                {showChatHeaderDropdown && (
                  <div className="absolute top-11 right-0 bg-[#1A1A2E] rounded-lg border border-[#3A3A52] shadow-2xl py-1.5 w-44 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={() => setShowChatHeaderDropdown(false)} className="w-full text-left px-4 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] transition">View Info</button>
                    <button onClick={() => { setShowChatHeaderDropdown(false); setShowMeetingModal(true); }} className="w-full text-left px-4 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] transition">Schedule Session</button>
                    <div className="h-px bg-[#3A3A52] my-1" />
                    <button onClick={() => { setShowChatHeaderDropdown(false); setMessages([]); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#0F0F1A] transition">Clear Messages</button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Header Translation Strip */}
            <div className="bg-[#1A1A2E]/60 border-b border-[#3A3A52]/40 px-4 py-1.5 flex items-center gap-2 text-xs text-[#5C5A70] shrink-0">
              <Globe size={12} className="text-[#C9A84C]" />
              <span>Real-time optimization matching powered by secure ledger workspace translation logs.</span>
            </div>

            {/* CHAT STREAM WALLPAPER PANELS */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-[#0F0F1A] relative no-scrollbar">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-[#C9A84C] animate-spin" /></div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const isSystem = msg.message_type === "system";
                  const isFile = msg.message_type === "file";
                  const isVoice = msg.file_name?.endsWith(".webm") || msg.message_type === "voice";
                  const isImage = isFile && isImageFile(msg.file_name || "");

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="bg-[#1A1A2E] border border-[#3A3A52] shadow-sm text-[#5C5A70] text-xs font-normal rounded-md px-3 py-1.5 max-w-md text-center tracking-wide">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`relative max-w-[65%] rounded-lg px-3 pb-5 pt-1.5 shadow-md text-sm flex flex-col gap-1 border border-[#3A3A52]/40 ${
                        isMe ? "bg-[#1A1A2E] text-[#F5F3ED] rounded-tr-none border-t-[#C9A84C]" : "bg-[#1A1A2E]/40 text-[#F5F3ED] rounded-tl-none"
                      }`}>
                        
                        {/* Image Attachment Rendering Inline Window (Point 2 Fix) */}
                        {isImage ? (
                          <div className="block mb-1 relative rounded overflow-hidden border border-[#3A3A52] max-w-xs bg-[#0F0F1A]">
                            <Image 
                              src={msg.file_url || ""} 
                              alt={msg.file_name || "Media"} 
                              width={320} 
                              height={240} 
                              unoptimized 
                              className="object-cover max-h-60 w-full"
                            />
                            {/* Download Action Overlay Trim Bar */}
                            <div className="p-1.5 bg-[#1A1A2E] flex items-center justify-between border-t border-[#3A3A52]">
                              <span className="text-xs text-[#5C5A70] truncate max-w-45">{msg.file_name}</span>
                              <a 
                                href={msg.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-[#C9A84C] font-semibold hover:underline px-1"
                              >
                                Open
                              </a>
                            </div>
                          </div>
                        ) : isVoice ? (
                          /* Accurate Voice Bubble Row Integration Tracking Engine (Point 3 Fix) */
                          <div className="flex items-center gap-3 py-1 min-w-60">
                            <button
                              onClick={() => handleVoicePlayToggle(msg.id, msg.file_url || "")}
                              className="w-9 h-9 rounded-full bg-[#0F0F1A] border border-[#3A3A52] flex items-center justify-center shrink-0 text-[#C9A84C] transition-all active:scale-95 hover:border-[#C9A84C]/40"
                            >
                              {playingAudio === msg.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <div className="flex-1 flex flex-col justify-center">
                              <div className="text-[11px] font-medium text-[#C9A84C]">Voice Message</div>
                              <div className="h-1 bg-[#0F0F1A] rounded-full overflow-hidden mt-1.5 relative">
                                <div 
                                  className="absolute top-0 left-0 bottom-0 bg-[#C9A84C] transition-all duration-100 ease-linear" 
                                  style={{ width: `${audioProgress[msg.id] || 0}%` }}
                                />
                              </div>
                              <div className="text-[9px] text-[#5C5A70] mt-0.5 self-end">
                                {audioDurations[msg.id] ? formatDuration(Math.round(audioDurations[msg.id])) : "Voice Note"}
                              </div>
                            </div>
                          </div>
                        ) : isFile ? (
                          /* Document Block Layout */
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-[#0F0F1A] rounded border border-[#3A3A52] mb-0.5 hover:border-[#C9A84C] transition">
                            <div className="w-10 h-10 bg-[#1A1A2E] rounded flex items-center justify-center shrink-0 text-[#C9A84C]">
                              {msg.file_name?.includes(".pdf") ? <FileText size={20} /> : <LucideFile size={20} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate text-[#F5F3ED]">{msg.file_name || "Asset File"}</div>
                              <div className="text-xs text-[#5C5A70]">Download Attachment</div>
                            </div>
                          </a>
                        ) : (
                          /* Base Text Bubble Node */
                          <p className="whitespace-pre-wrap leading-relaxed pr-8 wrap-break-word text-[#F5F3ED]">{msg.content}</p>
                        )}

                        {/* WhatsApp Ticks Footer Container */}
                        <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                          <span className="text-[10px] text-[#5C5A70] font-light">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && (
                            <span className="shrink-0 flex items-center">
                              {msg.delivery_status === "read" ? (
                                <div className="flex -space-x-1 text-[#C9A84C]"><Check size={13} /><Check size={13} /></div>
                              ) : msg.delivery_status === "delivered" ? (
                                <div className="flex -space-x-1 text-[#5C5A70]"><Check size={13} /><Check size={13} /></div>
                              ) : (
                                <Check size={13} className="text-[#5C5A70]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
              <audio ref={audioRef} className="hidden" />
            </div>

            {/* BOTTOM BAR CONTROLS */}
            <div className="bg-[#1A1A2E] border-t border-[#3A3A52] px-4 py-2.5 flex items-center gap-3 relative shrink-0">
              
              {/* Voice Note Stream Overlay */}
              {recording && (
                <div className="absolute inset-0 bg-[#1A1A2E] px-4 flex items-center justify-between z-10 border-t border-[#3A3A52]">
                  <div className="flex items-center gap-3 text-red-500 text-sm font-medium animate-pulse">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Recording: {formatDuration(duration)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={cancelRecording} className="text-[#5C5A70] hover:text-[#F5F3ED]"><X size={20} /></button>
                    <button onClick={stopRecording} className="w-9 h-9 bg-red-600 border border-red-500 rounded-full flex items-center justify-center text-white shadow"><Square size={14} fill="currentColor" /></button>
                  </div>
                </div>
              )}

              {/* Ready Voice Note Preview */}
              {audioBlob && !recording && (
                <div className="absolute inset-0 bg-[#1A1A2E] px-4 flex items-center justify-between z-10 border-t border-[#3A3A52]">
                  <div className="flex items-center gap-2 text-[#C9A84C] text-sm font-medium">
                    <Mic size={16} />
                    <span>Voice Note Pack Ready ({formatDuration(duration)})</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={cancelRecording} className="text-[#5C5A70] hover:text-[#F5F3ED]"><X size={20} /></button>
                    <button onClick={sendVoiceNote} className="bg-[#C9A84C] text-[#0F0F1A] px-4 py-1.5 rounded font-bold text-sm tracking-wide shadow hover:opacity-90 transition">Send Asset</button>
                  </div>
                </div>
              )}

              {/* Action Buttons Container Popover Group */}
              <div className="flex items-center gap-2 text-[#5C5A70]">
                {/* Emoji Activation Matrix (Point 6 Fix) */}
                <div className="relative" ref={emojiPickerRef}>
                  <button 
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }} 
                    className={`hover:text-[#C9A84C] p-1 transition-colors duration-150 ${showEmojiPicker ? "text-[#C9A84C]" : ""}`}
                  >
                    <Smile size={24} />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-[#1A1A2E] rounded-xl shadow-2xl border border-[#3A3A52] p-3 w-64 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="text-xs text-[#5C5A70] font-semibold mb-2 tracking-wide select-none">SYSTEM EMOJIS</div>
                      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                        {POPULAR_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => { insertEmoji(emoji); setShowEmojiPicker(false); }}
                            className="text-xl p-1 rounded hover:bg-[#0F0F1A] transition active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={attachMenuRef}>
                  <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }} className={`hover:text-[#C9A84C] p-1 transition ${showAttachMenu ? "rotate-45 text-[#C9A84C]" : ""}`}><Paperclip size={22} /></button>
                  
                  {/* Floating Attachment Popover Menu - Auto Closes via triggers (Point 5 Fix) */}
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-[#1A1A2E] rounded-xl shadow-2xl border border-[#3A3A52] p-2 flex flex-col gap-1 w-48 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => triggerFileInputAction("image/*")} className="flex items-center gap-3 px-3 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] rounded-lg transition text-left w-full"><ImageIcon size={16} className="text-[#C9A84C]" />Images & Videos</button>
                      <button onClick={() => triggerFileInputAction(".pdf,.doc,.docx,.xls,.xlsx")} className="flex items-center gap-3 px-3 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] rounded-lg transition text-left w-full"><FileText size={16} className="text-[#C9A84C]" />Documents</button>
                      <button onClick={handleNDA} className="flex items-center gap-3 px-3 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] rounded-lg transition text-left w-full"><FileText size={16} className="text-[#C9A84C]" />Request NDA</button>
                      <button onClick={() => { setShowAttachMenu(false); setShowMeetingModal(true); }} className="flex items-center gap-3 px-3 py-2 text-sm text-[#F5F3ED] hover:bg-[#0F0F1A] rounded-lg transition text-left w-full"><Calendar size={16} className="text-[#C9A84C]" />Schedule Session</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input Bar */}
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] outline-none rounded-lg text-[#F5F3ED] placeholder-[#5C5A70] text-sm px-4 py-2.5 focus:border-[#C9A84C] transition"
                />
              </div>

              {/* Dynamic Send / Mic triggers */}
              <div className="text-[#5C5A70] shrink-0">
                {input.trim() ? (
                  <button onClick={sendMessage} disabled={sending} className="p-2 hover:text-[#C9A84C] transition">
                    {sending ? <Loader2 size={22} className="animate-spin text-[#C9A84C]" /> : <Send size={22} className="text-[#C9A84C]" />}
                  </button>
                ) : (
                  <button onMouseDown={startRecording} className="p-2 hover:text-[#C9A84C] transition" title="Hold to record voice message"><Mic size={22} /></button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty Active Splash Canvas */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1A1A2E]/10 border-b-4 border-[#C9A84C]">
            <div className="w-24 h-24 rounded-full bg-[#1A1A2E] border border-[#3A3A52] flex items-center justify-center mb-6 text-[#C9A84C]/40">
              <MessageCircle size={48} />
            </div>
            <h2 className="text-[#F5F3ED] text-xl font-light mb-2 tracking-wide">iVest Web Messenger</h2>
            <p className="text-[#5C5A70] text-sm max-w-sm leading-relaxed">Select an active deal ledger or venture workspace to begin secure real-time messaging communications.</p>
          </div>
        )}
      </div>

      {/* SCHEDULE MEETING MODAL COMPONENT */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#C9A84C]">Schedule Deal Session</h3>
              <button onClick={() => setShowMeetingModal(false)} className="text-[#5C5A70] hover:text-[#F5F3ED]"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Session Title"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />
              <textarea
                placeholder="Agenda Details"
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                rows={3}
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#C9A84C] transition text-left"
                />
                <input
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#C9A84C] transition text-left"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-2 justify-end">
              <button onClick={() => setShowMeetingModal(false)} className="px-4 py-2 rounded-lg text-sm bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] hover:bg-[#252538] transition">Cancel</button>
              <button onClick={handleScheduleMeeting} className="px-5 py-2 rounded-lg text-sm bg-[#C9A84C] text-[#0F0F1A] font-bold hover:opacity-90 transition">Confirm Booking</button>
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
      <div className="h-screen w-screen bg-[#0F0F1A] flex items-center justify-center">
        <Loader2 size={36} className="text-[#C9A84C] animate-spin" />
      </div>
    }>
      <ChatsInner />
    </Suspense>
  );
}