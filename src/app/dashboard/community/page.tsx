"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Users, Plus, Heart, MessageCircle, CheckCircle,
  Loader2, X, Send, Pin, Eye, EyeOff, Image as ImageIcon,
  Sparkles, Share2, Bookmark, BookmarkCheck, TrendingUp,
  Flame, Hash, Shield, Globe, ExternalLink, ThumbsUp,
  MessageSquare, MoreHorizontal, ArrowLeft, Maximize2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  title: string | null;
  content: string;
  category: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_id: string;
  image_url: string | null;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    is_verified: boolean;
    avatar_url: string | null;
    subscription_tier: string;
    role?: string;
  } | null;
};

type Comment = {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    is_verified: boolean;
    avatar_url: string | null;
    role?: string;
  } | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORIES = [
  { id: "all", label: "All Feed", icon: Globe },
  { id: "deals", label: "Deals & Funding", icon: TrendingUp },
  { id: "showcase", label: "Startup Showcase", icon: Sparkles },
  { id: "ask", label: "Questions & Advice", icon: MessageSquare },
  { id: "news", label: "Market News", icon: Flame },
  { id: "general", label: "General Chat", icon: Users },
];

const CATEGORY_STYLES: Record<string, { badge: string; text: string; dot: string }> = {
  general: { badge: "bg-[#1A1A2E] border-[#3A3A52] text-[#A8A6B8]", text: "text-[#A8A6B8]", dot: "bg-[#A8A6B8]" },
  deals: { badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", text: "text-emerald-400", dot: "bg-emerald-400" },
  news: { badge: "bg-blue-500/10 border-blue-500/30 text-blue-400", text: "text-blue-400", dot: "bg-blue-400" },
  ask: { badge: "bg-purple-500/10 border-purple-500/30 text-purple-400", text: "text-purple-400", dot: "bg-purple-400" },
  showcase: { badge: "bg-[#C9A84C]/15 border-[#C9A84C]/40 text-[#C9A84C]", text: "text-[#C9A84C]", dot: "bg-[#C9A84C]" },
  anonymous: { badge: "bg-purple-900/20 border-purple-800/40 text-purple-300", text: "text-purple-300", dot: "bg-purple-400" },
};

const TRENDING_TAGS = [
  { tag: "#SeedRound", count: "48 discussions" },
  { tag: "#FinTechAfrica", count: "32 discussions" },
  { tag: "#Web3Builders", count: "29 discussions" },
  { tag: "#AIStartup", count: "24 discussions" },
  { tag: "#DeFi", count: "19 discussions" },
  { tag: "#HiringTalent", count: "15 discussions" },
];

export default function CommunityPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    username: string;
    role: string;
    subscription_tier: string;
    avatar_url?: string | null;
  } | null>(null);
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  
  // Post Composer State
  const [postForm, setPostForm] = useState<{
    title: string;
    content: string;
    category: string;
    is_anonymous: boolean;
    image_url: string | null;
  }>({
    title: "",
    content: "",
    category: "general",
    is_anonymous: false,
    image_url: null,
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    const loadCommunityData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, full_name, username, role, subscription_tier, avatar_url")
            .eq("id", user.id)
            .single();
          if (prof) setProfile(prof);

          const { data: likes } = await supabase
            .from("community_likes")
            .select("post_id")
            .eq("user_id", user.id);
          setLikedPosts(likes?.map((l) => l.post_id) || []);
        }

        const res = await fetch("/api/community/posts");
        const { posts: postsData } = await res.json();
        setPosts(postsData || []);
      } catch (err) {
        console.error("Community data loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadCommunityData();
  }, [supabase]);

  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/comments?postId=${postId}`);
      const { comments: data } = await res.json();
      setComments(data || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  const openPost = (post: Post) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 5 * 1024 * 1024) {
      setPostError("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      setPostError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "community");
      formData.append("path", `post_${profile.id}`);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      if (data.url) {
        setPostForm((prev) => ({ ...prev, image_url: data.url }));
      }
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submitPost = async () => {
    if (!postForm.content.trim() || !profile) return;
    setSubmitting(true);
    setPostError(null);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: profile.id,
          title: postForm.title || null,
          content: postForm.content,
          category: postForm.is_anonymous ? "anonymous" : postForm.category,
          isAnonymous: postForm.is_anonymous,
          imageUrl: postForm.image_url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPostError(data.error || "Failed to publish post.");
        setSubmitting(false);
        return;
      }

      if (data.post) {
        setPosts((prev) => [data.post, ...prev]);
      }

      setShowNewPostModal(false);
      setPostForm({ title: "", content: "", category: "general", is_anonymous: false, image_url: null });
    } catch (err: any) {
      setPostError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPost || !profile) return;
    setSubmittingComment(true);

    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: selectedPost.id,
          authorId: profile.id,
          content: newComment,
          isAnonymous: false,
        }),
      });

      const data = await res.json();

      if (res.ok && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
        setSelectedPost((prev) =>
          prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPost.id
              ? { ...p, comment_count: (p.comment_count || 0) + 1 }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Comment submission error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleLike = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!profile) return;
    const isLiked = likedPosts.includes(postId);

    // Optimistic UI update
    setLikedPosts((prev) =>
      isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, like_count: Math.max(0, (p.like_count || 0) + (isLiked ? -1 : 1)) }
          : p
      )
    );
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) =>
        prev
          ? { ...prev, like_count: Math.max(0, (prev.like_count || 0) + (isLiked ? -1 : 1)) }
          : prev
      );
    }

    try {
      await fetch("/api/community/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          userId: profile.id,
          action: isLiked ? "unlike" : "like",
        }),
      });
    } catch (err) {
      console.error("Like toggle error:", err);
    }
  };

  const toggleBookmark = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    showToast(bookmarkedPosts.includes(postId) ? "Post removed from saved" : "Post saved to bookmarks!");
  };

  const sharePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/dashboard/community?post=${postId}`;
      navigator.clipboard.writeText(url);
      showToast("Post link copied to clipboard! 🔗");
    }
  };

  const showToast = (message: string) => {
    setCopyToast(message);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const filteredPosts = useMemo(() => {
    if (activeCategory === "all") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const isPremium = profile?.subscription_tier === "premium" || profile?.subscription_tier === "pro";

  // Post Detail Thread View
  if (selectedPost) {
    const style = CATEGORY_STYLES[selectedPost.category] || CATEGORY_STYLES.general;
    const isLiked = likedPosts.includes(selectedPost.id);
    const isBookmarked = bookmarkedPosts.includes(selectedPost.id);

    return (
      <DashboardShell
        role={profile?.role}
        fullName={profile?.full_name}
        username={profile?.username}
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setSelectedPost(null); setComments([]); }}
              className="flex items-center gap-2 text-sm text-[#A8A6B8] hover:text-[#F5F3ED] transition px-3 py-1.5 rounded-lg bg-[#1A1A2E] border border-[#3A3A52]"
            >
              <ArrowLeft size={16} />
              <span>Back to Feed</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => sharePost(selectedPost.id, e)}
                className="p-2 text-[#A8A6B8] hover:text-[#C9A84C] hover:bg-[#1A1A2E] rounded-lg transition border border-transparent hover:border-[#3A3A52]"
                title="Share link"
              >
                <Share2 size={16} />
              </button>
              <button
                onClick={(e) => toggleBookmark(selectedPost.id, e)}
                className="p-2 text-[#A8A6B8] hover:text-[#C9A84C] hover:bg-[#1A1A2E] rounded-lg transition border border-transparent hover:border-[#3A3A52]"
                title="Bookmark"
              >
                {isBookmarked ? <BookmarkCheck size={16} className="text-[#C9A84C]" /> : <Bookmark size={16} />}
              </button>
            </div>
          </div>

          {/* Main Thread Card */}
          <article className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 shadow-xl space-y-4">
            {/* Author Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C20] to-[#1A1A2E] border border-[#3A3A52] flex items-center justify-center text-base font-bold text-[#C9A84C] overflow-hidden shrink-0">
                  {selectedPost.is_anonymous ? (
                    <EyeOff size={20} className="text-purple-400" />
                  ) : selectedPost.profiles?.avatar_url ? (
                    <img src={selectedPost.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedPost.profiles?.full_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base text-[#F5F3ED]">
                      {selectedPost.is_anonymous ? "Anonymous Member" : selectedPost.profiles?.full_name || "Community Member"}
                    </span>
                    {!selectedPost.is_anonymous && selectedPost.profiles?.is_verified && (
                      <CheckCircle size={15} className="text-emerald-400 fill-emerald-400/20" />
                    )}
                    {!selectedPost.is_anonymous && selectedPost.profiles?.role && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#2A2A3E] text-[#A8A6B8] border border-[#3A3A52] capitalize font-medium">
                        {selectedPost.profiles.role}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5C5A70] flex items-center gap-2 mt-0.5">
                    <span>@{selectedPost.is_anonymous ? "anonymous" : selectedPost.profiles?.username || "user"}</span>
                    <span>·</span>
                    <span>{timeAgo(selectedPost.created_at)}</span>
                  </div>
                </div>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full border capitalize font-medium flex items-center gap-1.5 ${style.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {selectedPost.category}
              </span>
            </div>

            {/* Title & Body Content */}
            {selectedPost.title && (
              <h1 className="text-xl font-bold text-[#F5F3ED] tracking-tight pt-1">
                {selectedPost.title}
              </h1>
            )}
            <p className="text-[#D8D6E2] text-base leading-relaxed whitespace-pre-wrap">
              {selectedPost.content}
            </p>

            {/* Attached Full Image Showcase with Lightbox Trigger */}
            {selectedPost.image_url && (
              <div 
                onClick={() => setPreviewImageModal(selectedPost.image_url)}
                className="relative mt-4 rounded-2xl border border-[#3A3A52] overflow-hidden bg-black/60 cursor-pointer group shadow-2xl transition hover:border-[#C9A84C]/50"
              >
                <img
                  src={selectedPost.image_url}
                  alt="Post attachment"
                  className="w-full max-h-[580px] object-contain mx-auto transition duration-300 group-hover:scale-[1.01]"
                />
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-[#F5F3ED] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg">
                  <Maximize2 size={13} className="text-[#C9A84C]" />
                  <span>Click to expand full image</span>
                </div>
              </div>
            )}

            {/* Engagement Stats Bar */}
            <div className="flex items-center justify-between border-t border-b border-[#3A3A52]/60 py-3.5 mt-4 text-sm text-[#A8A6B8]">
              <div className="flex items-center gap-8">
                <button
                  onClick={() => toggleLike(selectedPost.id)}
                  className={`flex items-center gap-2 text-sm font-medium transition ${
                    isLiked ? "text-red-400" : "text-[#A8A6B8] hover:text-red-400"
                  }`}
                >
                  <Heart size={18} className={isLiked ? "fill-red-400 text-red-400 scale-110 transition-transform" : ""} />
                  <span>{selectedPost.like_count || 0} Likes</span>
                </button>
                <div className="flex items-center gap-2 text-sm font-medium text-[#A8A6B8]">
                  <MessageCircle size={18} className="text-blue-400" />
                  <span>{comments.length} Replies</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => sharePost(selectedPost.id, e)}
                  className="text-xs text-[#5C5A70] hover:text-[#C9A84C] transition flex items-center gap-1"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Comment Composer */}
            <div className="flex items-start gap-3 pt-2">
              <div className="w-9 h-9 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-bold text-[#C9A84C] shrink-0 border border-[#3A3A52] overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || "?"
                )}
              </div>
              <div className="flex-1 bg-[#0F0F1A] border border-[#3A3A52] focus-within:border-[#C9A84C] rounded-xl p-3 transition">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                  rows={2}
                  placeholder="Write a constructive reply (Press Enter to post)…"
                  className="w-full bg-transparent text-[#F5F3ED] text-sm outline-none placeholder-[#5C5A70] resize-none"
                />
                <div className="flex items-center justify-between border-t border-[#3A3A52]/40 pt-2 mt-1">
                  <span className="text-[11px] text-[#5C5A70]">Markdown formatting supported</span>
                  <button
                    onClick={submitComment}
                    disabled={!newComment.trim() || submittingComment}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      newComment.trim() && !submittingComment
                        ? "bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#D4B55D]"
                        : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                    }`}
                  >
                    {submittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* Comment Thread Stream */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#F5F3ED] px-1 flex items-center gap-2">
              <span>Discussion Thread</span>
              <span className="text-xs font-normal text-[#5C5A70]">({comments.length})</span>
            </h3>

            {comments.length === 0 ? (
              <div className="bg-[#1A1A2E]/50 border border-dashed border-[#3A3A52] rounded-2xl p-8 text-center space-y-2">
                <MessageSquare size={28} className="text-[#5C5A70] mx-auto opacity-50" />
                <p className="text-sm text-[#A8A6B8] font-medium">No replies yet</p>
                <p className="text-xs text-[#5C5A70]">Start the conversation by leaving a reply above.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 transition hover:border-[#4A4A62] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#C9A84C20] border border-[#3A3A52] flex items-center justify-center text-xs font-bold text-[#C9A84C] shrink-0 overflow-hidden">
                        {c.is_anonymous ? (
                          <EyeOff size={14} className="text-purple-400" />
                        ) : c.profiles?.avatar_url ? (
                          <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.profiles?.full_name?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#F5F3ED]">
                            {c.is_anonymous ? "Anonymous" : c.profiles?.full_name || "Community Member"}
                          </span>
                          {!c.is_anonymous && c.profiles?.is_verified && (
                            <CheckCircle size={12} className="text-emerald-400 fill-emerald-400/20" />
                          )}
                          {!c.is_anonymous && c.profiles?.role && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2A2A3E] text-[#A8A6B8] capitalize">
                              {c.profiles.role}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5C5A70]">@{c.profiles?.username || "user"} · {timeAgo(c.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#D8D6E2] pl-10.5 leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Main Social Community Feed View (3-Column layout)
  return (
    <DashboardShell
      role={profile?.role}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        
        {/* Toast Notification */}
        {copyToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#C9A84C] text-[#0A0A0F] font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle size={15} />
            <span>{copyToast}</span>
          </div>
        )}

        {/* 3-Column Layout: Navigation | Feed | Trending & Connect */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Fixed User Quick Card & Categories */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-[72px] self-start max-h-[calc(100vh-90px)] overflow-y-auto scrollbar-none pr-1">
            {/* User Profile Card */}
            {profile && (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C20] to-[#1A1A2E] border border-[#3A3A52] flex items-center justify-center text-sm font-bold text-[#C9A84C] overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.full_name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#F5F3ED] truncate">{profile.full_name}</h3>
                    <p className="text-xs text-[#5C5A70] truncate">@{profile.username}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] capitalize font-medium">
                      {profile.role}
                    </span>
                  </div>
                </div>
                <div className="border-t border-[#3A3A52]/60 pt-2.5 flex items-center justify-between text-xs text-[#A8A6B8]">
                  <span>Tier Status</span>
                  <span className="font-semibold text-[#C9A84C] capitalize">{profile.subscription_tier || "Free"}</span>
                </div>
              </div>
            )}

            {/* Category Navigation Pills */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-3 shadow-lg space-y-1">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#5C5A70]">
                Feeds & Channels
              </div>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-[#C9A84C] text-[#0A0A0F] font-bold shadow-md shadow-[#C9A84C]/20"
                        : "text-[#A8A6B8] hover:bg-[#2A2A3E] hover:text-[#F5F3ED]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} />
                      <span>{cat.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0F]" />}
                  </button>
                );
              })}
            </div>

            {/* Quick Rules */}
            <div className="bg-[#1A1A2E]/60 border border-[#3A3A52]/70 rounded-2xl p-4 text-xs text-[#5C5A70] space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#A8A6B8]">
                <Shield size={14} className="text-[#C9A84C]" />
                <span>Verified Standards</span>
              </div>
              <p className="leading-relaxed">
                Respect deal privacy, avoid off-platform solicitations, and maintain verified credibility.
              </p>
            </div>
          </aside>

          {/* CENTER: Main Feed Stream & Inline Composer */}
          <main className="col-span-1 lg:col-span-6 space-y-4">
            
            {/* Header with Title & Mobile Post Button */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h1 className="text-xl font-bold text-[#F5F3ED] tracking-tight flex items-center gap-2">
                  <span>Community Network</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 font-medium">
                    Live
                  </span>
                </h1>
                <p className="text-xs text-[#5C5A70] mt-0.5">Connect, share dealflow, showcase startups, and discuss trends</p>
              </div>

              <button
                onClick={() => setShowNewPostModal(true)}
                className="lg:hidden flex items-center gap-1.5 bg-[#C9A84C] text-[#0A0A0F] text-xs font-bold px-3.5 py-2 rounded-full shadow-lg"
              >
                <Plus size={14} />
                <span>Post</span>
              </button>
            </div>

            {/* Mobile Category Horizontal Scroller */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`shrink-0 flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition ${
                      isActive
                        ? "bg-[#C9A84C] text-[#0A0A0F] border-[#C9A84C] font-bold"
                        : "bg-[#1A1A2E] text-[#A8A6B8] border-[#3A3A52]"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* INLINE SOCIAL POST COMPOSER (Twitter/X & LinkedIn Style) */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C20] to-[#1A1A2E] border border-[#3A3A52] flex items-center justify-center text-sm font-bold text-[#C9A84C] shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Subject title (optional)"
                    className="w-full bg-transparent text-[#F5F3ED] text-sm font-semibold outline-none placeholder-[#5C5A70] border-b border-[#3A3A52]/40 pb-1.5 focus:border-[#C9A84C]"
                  />

                  <textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    rows={3}
                    placeholder="Share an update, pitch your startup, ask for advice, or post a deal insight…"
                    className="w-full bg-transparent text-[#F5F3ED] text-sm leading-relaxed outline-none placeholder-[#5C5A70] resize-none"
                  />

                  {/* Image Attachment Preview in Composer */}
                  {postForm.image_url && (
                    <div className="relative mt-2 rounded-xl border border-[#3A3A52] overflow-hidden bg-black/60 max-h-72">
                      <img
                        src={postForm.image_url}
                        alt="Uploaded preview"
                        className="w-full max-h-72 object-contain mx-auto"
                      />
                      <button
                        onClick={() => setPostForm((p) => ({ ...p, image_url: null }))}
                        className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full text-white transition shadow-lg"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Composer Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#3A3A52]/60 pt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#C9A84C] bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 border border-[#C9A84C]/30 transition"
                      >
                        {uploadingImage ? (
                          <Loader2 size={14} className="animate-spin text-[#C9A84C]" />
                        ) : (
                          <ImageIcon size={14} />
                        )}
                        <span>{uploadingImage ? "Uploading…" : "Add Image"}</span>
                      </button>

                      {/* Category Chip Selector */}
                      <select
                        value={postForm.category}
                        onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                        className="bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C9A84C]"
                      >
                        {CATEGORIES.filter(c => c.id !== "all").map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>

                      {/* Anonymous Toggle (Pro feature) */}
                      <button
                        type="button"
                        onClick={() => isPremium && setPostForm({ ...postForm, is_anonymous: !postForm.is_anonymous })}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition border ${
                          postForm.is_anonymous
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-[#0F0F1A] text-[#5C5A70] border-[#3A3A52] hover:text-[#A8A6B8]"
                        }`}
                        title={isPremium ? "Post anonymously" : "Upgrade to Pro for anonymous posting"}
                      >
                        {postForm.is_anonymous ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span className="hidden sm:inline">{postForm.is_anonymous ? "Anonymous" : "Public"}</span>
                      </button>
                    </div>

                    <button
                      onClick={submitPost}
                      disabled={!postForm.content.trim() || submitting || uploadingImage}
                      className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition shadow-md ${
                        postForm.content.trim() && !submitting && !uploadingImage
                          ? "bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#D4B55D] shadow-[#C9A84C]/20"
                          : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                      }`}
                    >
                      {submitting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      <span>{submitting ? "Posting…" : "Publish"}</span>
                    </button>
                  </div>

                  {postError && (
                    <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 px-3 py-1.5 rounded-lg">
                      {postError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* FEED POSTS STREAM */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
                <p className="text-xs text-[#5C5A70]">Loading community conversations…</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-[#1A1A2E]/40 border border-dashed border-[#3A3A52] rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#2A2A3E] flex items-center justify-center mx-auto text-[#5C5A70]">
                  <Users size={24} />
                </div>
                <h3 className="text-base font-bold text-[#F5F3ED]">No discussions in this channel yet</h3>
                <p className="text-xs text-[#A8A6B8] max-w-sm mx-auto">
                  Be the catalyst! Share the first post to kick off the conversation with verified founders and investors.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const style = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.general;
                  const isLiked = likedPosts.includes(post.id);
                  const isBookmarked = bookmarkedPosts.includes(post.id);

                  return (
                    <article
                      key={post.id}
                      onClick={() => openPost(post)}
                      className="bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#4A4A62] rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer space-y-3 group"
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C20] to-[#1A1A2E] border border-[#3A3A52] flex items-center justify-center text-xs font-bold text-[#C9A84C] shrink-0 overflow-hidden">
                            {post.is_anonymous ? (
                              <EyeOff size={16} className="text-purple-400" />
                            ) : post.profiles?.avatar_url ? (
                              <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              post.profiles?.full_name?.[0]?.toUpperCase() || "?"
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-[#F5F3ED] group-hover:text-[#C9A84C] transition-colors">
                                {post.is_anonymous ? "Anonymous" : post.profiles?.full_name || "Community Member"}
                              </span>
                              {!post.is_anonymous && post.profiles?.is_verified && (
                                <CheckCircle size={13} className="text-emerald-400 fill-emerald-400/20" />
                              )}
                              {!post.is_anonymous && post.profiles?.role && (
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#2A2A3E] text-[#A8A6B8] border border-[#3A3A52] capitalize">
                                  {post.profiles.role}
                                </span>
                              )}
                              {post.is_pinned && (
                                <span className="flex items-center gap-1 text-[10px] text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.2 rounded-md font-medium">
                                  <Pin size={10} /> Pinned
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#5C5A70] flex items-center gap-2">
                              <span>@{post.is_anonymous ? "anonymous" : post.profiles?.username || "user"}</span>
                              <span>·</span>
                              <span>{timeAgo(post.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full border capitalize font-medium shrink-0 flex items-center gap-1.5 ${style.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {post.category}
                        </span>
                      </div>

                      {/* Post Content */}
                      {post.title && (
                        <h2 className="text-base font-bold text-[#F5F3ED] tracking-tight">
                          {post.title}
                        </h2>
                      )}
                      <p className="text-[#D8D6E2] text-sm leading-relaxed whitespace-pre-wrap line-clamp-5">
                        {post.content}
                      </p>

                      {/* FULL MODERATE ATTACHED IMAGE (X / Facebook Style) */}
                      {post.image_url && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageModal(post.image_url);
                          }}
                          className="relative rounded-2xl border border-[#3A3A52]/70 overflow-hidden bg-black/50 max-h-[480px] shadow-md group/img transition hover:border-[#C9A84C]/60"
                        >
                          <img
                            src={post.image_url}
                            alt="Post attachment"
                            className="w-full max-h-[480px] object-cover sm:object-contain mx-auto transition duration-300 group-hover/img:scale-[1.01]"
                          />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover/img:opacity-100 transition">
                            <Maximize2 size={14} />
                          </div>
                        </div>
                      )}

                      {/* Post Interactive Action Bar */}
                      <div className="flex items-center justify-between border-t border-[#3A3A52]/50 pt-3 text-xs text-[#A8A6B8]">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={(e) => toggleLike(post.id, e)}
                            className={`flex items-center gap-1.5 transition ${
                              isLiked ? "text-red-400 font-bold" : "text-[#A8A6B8] hover:text-red-400"
                            }`}
                          >
                            <Heart size={16} className={isLiked ? "fill-red-400 text-red-400 scale-110 transition-transform" : ""} />
                            <span>{post.like_count || 0}</span>
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); openPost(post); }}
                            className="flex items-center gap-1.5 text-[#A8A6B8] hover:text-blue-400 transition"
                          >
                            <MessageCircle size={16} />
                            <span>{post.comment_count || 0}</span>
                          </button>

                          <button
                            onClick={(e) => sharePost(post.id, e)}
                            className="flex items-center gap-1.5 text-[#5C5A70] hover:text-[#C9A84C] transition"
                            title="Copy link"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>

                        <button
                          onClick={(e) => toggleBookmark(post.id, e)}
                          className={`p-1 transition ${
                            isBookmarked ? "text-[#C9A84C]" : "text-[#5C5A70] hover:text-[#C9A84C]"
                          }`}
                          title="Bookmark"
                        >
                          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR: Fixed Trending Tags & Platform Shortcuts */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-[72px] self-start max-h-[calc(100vh-90px)] overflow-y-auto scrollbar-none pl-1">
            {/* Trending Tags Card */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F5F3ED]">
                <Flame size={15} className="text-[#C9A84C]" />
                <span>Trending on iVest</span>
              </div>
              <div className="space-y-2 pt-1">
                {TRENDING_TAGS.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2A2A3E] transition cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#F5F3ED] hover:text-[#C9A84C] transition">{item.tag}</p>
                      <p className="text-[10px] text-[#5C5A70]">{item.count}</p>
                    </div>
                    <Hash size={13} className="text-[#5C5A70]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links & Platform Rules */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 shadow-lg space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F3ED]">Explore iVest</h3>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => router.push("/dashboard/talent")}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#C9A84C] transition text-left"
                >
                  <span>⚡ Browse Talent & Jobs</span>
                  <ExternalLink size={12} />
                </button>
                <button
                  onClick={() => router.push("/dashboard/upgrade")}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-semibold hover:bg-[#C9A84C]/20 transition text-left"
                >
                  <span>⭐ Upgrade to Pro</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* FULL IMAGE LIGHTBOX MODAL */}
        {previewImageModal && (
          <div
            onClick={() => setPreviewImageModal(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={24} />
            </button>
            <img
              src={previewImageModal}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* CREATE POST MODAL (For mobile button / header trigger) */}
        {showNewPostModal && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#3A3A52]/60 pb-3">
                <h3 className="text-sm font-bold text-[#F5F3ED] flex items-center gap-2">
                  <Sparkles size={16} className="text-[#C9A84C]" />
                  <span>Create Discussion</span>
                </h3>
                <button
                  onClick={() => {
                    setShowNewPostModal(false);
                    setPostError(null);
                  }}
                  className="p-1 rounded-lg text-[#5C5A70] hover:text-[#F5F3ED] transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="Thread Topic Title (optional)"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#C9A84C] transition"
                />

                <textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  rows={4}
                  placeholder="What would you like to share or discuss with the community?"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition resize-none"
                />

                {postForm.image_url && (
                  <div className="relative rounded-xl border border-[#3A3A52] overflow-hidden bg-black/60 max-h-60">
                    <img src={postForm.image_url} alt="" className="w-full max-h-60 object-contain mx-auto" />
                    <button
                      onClick={() => setPostForm((p) => ({ ...p, image_url: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full text-white transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-[#3A3A52]/60 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30"
                    >
                      {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                      <span>Add Image</span>
                    </button>
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                      className="bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] text-xs rounded-lg px-2.5 py-1.5 outline-none"
                    >
                      {CATEGORIES.filter(c => c.id !== "all").map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={submitPost}
                    disabled={!postForm.content.trim() || submitting || uploadingImage}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition ${
                      postForm.content.trim() && !submitting && !uploadingImage
                        ? "bg-[#C9A84C] text-[#0A0A0F] hover:bg-[#D4B55D]"
                        : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                    }`}
                  >
                    {submitting ? "Publishing…" : "Publish Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}