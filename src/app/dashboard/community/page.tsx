"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Users, Plus, Heart, MessageCircle,
  CheckCircle, Loader2, X, Send,
  Pin, Eye, EyeOff, Image as ImageIcon, Sparkles
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
  image_url: string | null; // 💡 Added for X-style media referencing
  profiles: {
    id: string;
    full_name: string;
    username: string;
    is_verified: boolean;
    avatar_url: string | null;
    subscription_tier: string;
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
    avatar_url: string | null; // 💡 Dynamic fallback support
  } | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const CATEGORIES = ["general", "deals", "news", "ask", "showcase"];

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-[#1A1A2E] text-[#A8A6B8] border-[#3A3A52]",
  deals: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
  news: "bg-blue-900/30 text-blue-400 border-blue-800",
  ask: "bg-purple-900/30 text-purple-400 border-purple-800",
  showcase: "bg-[#C9A84C20] text-[#C9A84C] border-[#C9A84C30]",
  anonymous: "bg-[#3A3A52] text-[#A8A6B8] border-[#5C5A70]",
};

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
  } | null>(null);
  
  const [activeCategory, setActiveCategory] = useState("all");
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Refactored state supporting image attachments
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
    image_url: null
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    const loadCommunityData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, username, role, subscription_tier")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      const res = await fetch("/api/community/posts");
      const { posts: postsData } = await res.json();
      setPosts(postsData || []);

      const { data: likes } = await supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_id", user.id);
      setLikedPosts(likes?.map((l) => l.post_id) || []);

      setLoading(false);
    };

    void loadCommunityData();
  }, [supabase]);

  const fetchComments = async (postId: string) => {
    const res = await fetch(`/api/community/comments?postId=${postId}`);
    const { comments: data } = await res.json();
    setComments(data || []);
  };

  const openPost = (post: Post) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  // Handles Media Selection and uploads to Supabase Storage Bucket
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploadingImage(true);
      setPostError(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community_attachments')
        .getPublicUrl(filePath);

      setPostForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Failed to upload image asset.");
    } finally {
      setUploadingImage(false);
    }
  };

  const submitPost = async () => {
    if (!postForm.content.trim() || !profile) return;
    setSubmitting(true);
    setPostError(null);

    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: profile.id,
        title: postForm.title || null,
        content: postForm.content,
        category: postForm.category,
        isAnonymous: postForm.is_anonymous,
        imageUrl: postForm.image_url, // Send attachment link downstream
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setPostError(data.error || "Failed to create post.");
      setSubmitting(false);
      return;
    }

    if (data.post) {
      setPosts((prev) => [data.post, ...prev]);
    }

    setShowNewPost(false);
    setPostForm({ title: "", content: "", category: "general", is_anonymous: false, image_url: null });
    setSubmitting(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || !selectedPost || !profile) return;
    setSubmittingComment(true);

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
    setSubmittingComment(false);
  };

  const toggleLike = async (postId: string) => {
    if (!profile) return;
    const isLiked = likedPosts.includes(postId);

    const res = await fetch("/api/community/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        userId: profile.id,
        action: isLiked ? "unlike" : "like",
      }),
    });

    const data = await res.json();

    if (res.ok) {
      if (isLiked) {
        setLikedPosts((prev) => prev.filter((id) => id !== postId));
      } else {
        setLikedPosts((prev) => [...prev, postId]);
      }
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, like_count: data.count } : p)
      );
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => prev ? { ...prev, like_count: data.count } : prev);
      }
    }
  };

  const filtered = posts.filter((p) =>
    activeCategory === "all" ? true : p.category === activeCategory
  );

  const isPremium = profile?.subscription_tier === "premium";

  // Detailed Full Post Thread view Layout
  if (selectedPost) {
    return (
      <DashboardShell
        role={profile?.role as "investor" | "builder" || "investor"}
        fullName={profile?.full_name}
        username={profile?.username}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <button
            onClick={() => { setSelectedPost(null); setComments([]); }}
            className="flex items-center gap-2 text-[#A8A6B8] text-sm hover:text-[#F5F3ED] transition w-fit"
          >
            ← Back to community
          </button>

          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              {/* Profile Image Asset Check */}
             <div className="w-10 h-10 rounded-full bg-[#C9A84C20] flex items-center justify-center text-sm font-medium text-[#C9A84C] shrink-0 overflow-hidden border border-[#3A3A52]">
  {selectedPost.is_anonymous ? "?" : selectedPost.profiles?.avatar_url ? (
    <img src={selectedPost.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
  ) : selectedPost.profiles?.full_name?.[0] || "?"}
</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#F5F3ED] text-sm font-medium">
                    {selectedPost.is_anonymous ? "Anonymous" : selectedPost.profiles?.full_name}
                  </span>
                  {!selectedPost.is_anonymous && selectedPost.profiles?.is_verified && (
                    <CheckCircle size={13} className="text-emerald-400 fill-emerald-400/10" />
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[selectedPost.category] || CATEGORY_STYLES.general}`}>
                    {selectedPost.category}
                  </span>
                  {selectedPost.is_pinned && <Pin size={12} className="text-[#C9A84C]" />}
                </div>
                <span className="text-[#5C5A70] text-xs">@{selectedPost.profiles?.username || "anonymous"} · {timeAgo(selectedPost.created_at)}</span>
              </div>
            </div>

            {selectedPost.title && (
              <h2 className="text-[#F5F3ED] text-base font-medium mb-2">{selectedPost.title}</h2>
            )}
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-4 whitespace-pre-wrap">{selectedPost.content}</p>

            {/* Attached Photo Frame Rendering */}
            {selectedPost.image_url && (
              <div className="mb-4 rounded-xl border border-[#3A3A52] overflow-hidden bg-black/40">
  <img src={selectedPost.image_url} alt="" className="w-full max-h-96 object-contain" />
</div>
            )}

            <div className="flex items-center gap-6 border-t border-[#3A3A52]/50 pt-3 mt-2">
              <button
                onClick={() => toggleLike(selectedPost.id)}
                className={`flex items-center gap-2 text-xs transition ${
                  likedPosts.includes(selectedPost.id) ? "text-red-400 font-medium" : "text-[#5C5A70] hover:text-red-400"
                }`}
              >
                <Heart size={15} className={likedPosts.includes(selectedPost.id) ? "fill-red-400 text-red-400" : ""} />
                {selectedPost.like_count || 0}
              </button>
              <span className="flex items-center gap-2 text-xs text-[#5C5A70]">
                <MessageCircle size={15} />
                {comments.length}
              </span>
            </div>
          </div>

          {/* Comments Context List Layout */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[#F5F3ED] text-sm font-medium px-1">Replies</h3>

            {comments.length === 0 ? (
              <p className="text-[#5C5A70] text-sm text-center py-6 bg-[#1A1A2E]/30 border border-[#3A3A52]/60 rounded-xl">
                No comments yet. Be the first to reply.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0 overflow-hidden">
  {c.is_anonymous ? "?" : c.profiles?.avatar_url ? (
    <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
  ) : c.profiles?.full_name?.[0] || "?"}
</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#F5F3ED] text-xs font-medium">
                        {c.is_anonymous ? "Anonymous" : c.profiles?.full_name}
                      </span>
                      {!c.is_anonymous && c.profiles?.is_verified && (
                        <CheckCircle size={11} className="text-emerald-400 fill-emerald-400/10" />
                      )}
                      <span className="text-[#5C5A70] text-xs">· {timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-[#A8A6B8] text-sm leading-relaxed pl-9">{c.content}</p>
                </div>
              ))
            )}

            <div className="flex gap-2 bg-[#1A1A2E] p-3 border border-[#3A3A52] rounded-xl items-center">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
                placeholder="Post your reply…"
                className="flex-1 bg-transparent text-[#F5F3ED] text-sm outline-none placeholder-[#5C5A70]"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || submittingComment}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  newComment.trim() && !submittingComment ? "bg-[#C9A84C] text-[#1A1A2E]" : "bg-[#2A2A3E] text-[#5C5A70]"
                }`}
              >
                {submittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Dashboard Overview Feed Index
  return (
    <DashboardShell
      role={profile?.role as "investor" | "builder" || "investor"}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-24 px-4 md:px-0 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F5F3ED] text-lg font-medium tracking-tight">Community Feed</h1>
            <p className="text-[#5C5A70] text-xs mt-0.5">Global investor & builder forum</p>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Post
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none snap-x touch-pan-x">
          {["all", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition capitalize ${
                activeCategory === cat
                  ? "bg-[#C9A84C] text-[#1A1A2E] border-[#C9A84C] font-semibold"
                  : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {!isPremium && (
          <div className="flex items-center gap-3 bg-[#C9A84C10] border border-[#C9A84C30] rounded-xl px-4 py-3">
            <EyeOff size={16} className="text-[#C9A84C] shrink-0" />
            <div className="flex-1">
              <p className="text-[#C9A84C] text-xs font-medium">Anonymous posting available</p>
              <p className="text-[#A8A6B8] text-xs mt-0.5">Upgrade to Premium to veil your public profile identity metrics</p>
            </div>
            <button onClick={() => router.push("/dashboard/profile")} className="text-[#C9A84C] text-xs font-semibold hover:underline shrink-0">
              Upgrade
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <Users size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">No posts yet</p>
            <button onClick={() => setShowNewPost(true)} className="text-[#C9A84C] text-xs underline underline-offset-2">
              Be the first to post
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4 hover:border-[#5C5A70] transition cursor-pointer"
                onClick={() => openPost(post)}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0 overflow-hidden border border-[#3A3A52]/50">
  {post.is_anonymous ? "?" : post.profiles?.avatar_url ? (
    <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
  ) : post.profiles?.full_name?.[0] || "?"}
</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#F5F3ED] text-sm font-medium truncate">
                        {post.is_anonymous ? "Anonymous" : post.profiles?.full_name}
                      </span>
                      {!post.is_anonymous && post.profiles?.is_verified && (
                        <CheckCircle size={12} className="text-emerald-400 fill-emerald-400/10" />
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border tracking-wide uppercase font-semibold ${CATEGORY_STYLES[post.category] || CATEGORY_STYLES.general}`}>
                        {post.category}
                      </span>
                      {post.is_pinned && <Pin size={11} className="text-[#C9A84C]" />}
                    </div>
                    <span className="text-[#5C5A70] text-xs">@{post.profiles?.username || "anonymous"} · {timeAgo(post.created_at)}</span>
                  </div>
                </div>

                {post.title && <h3 className="text-[#F5F3ED] text-sm font-semibold mb-1 pl-12">{post.title}</h3>}
                <p className="text-[#A8A6B8] text-sm leading-relaxed line-clamp-4 mb-3 pl-12 whitespace-pre-wrap">{post.content}</p>

                {/* Feed view Thumbnail Attachments */}
                {post.image_url && (
                  <div className="ml-12 mb-3 rounded-xl border border-[#3A3A52] overflow-hidden bg-black/30">
  <img src={post.image_url} alt="" className="w-full max-h-64 object-cover" />
</div>
                )}

                <div className="flex items-center gap-6 pl-12">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                    className={`flex items-center gap-1.5 text-xs transition ${
                      likedPosts.includes(post.id) ? "text-red-400 font-medium" : "text-[#5C5A70] hover:text-red-400"
                    }`}
                  >
                    <Heart size={14} className={likedPosts.includes(post.id) ? "fill-red-400" : ""} />
                    {post.like_count || 0}
                  </button>
                  <span className="flex items-center gap-1.5 text-xs text-[#5C5A70]">
                    <MessageCircle size={14} />
                    {post.comment_count || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fully Redesigned Post Creation Dialog Overlay */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center px-4 backdrop-blur-xs">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#F5F3ED] text-sm font-semibold tracking-wide flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#C9A84C]" /> Create thread
              </h3>
              <button onClick={() => { setShowNewPost(false); setPostError(null); setPostForm(prev => ({...prev, image_url: null})); }}>
                <X size={18} className="text-[#5C5A70] hover:text-[#F5F3ED]" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                placeholder="Thread topic header (optional)"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
              />

              <textarea
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                rows={4}
                placeholder="What's happening?"
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none whitespace-pre-wrap"
              />

              {/* Upload Render Preview Block */}
              {postForm.image_url && (
                <div className="rounded-xl border border-[#3A3A52] overflow-hidden bg-black/50">
  <img src={postForm.image_url} alt="" className="w-full max-h-64 object-contain" />
                  <button 
                    onClick={() => setPostForm(p => ({ ...p, image_url: null }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Select Forum Category</label>
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPostForm({ ...postForm, category: cat })}
                      className={`text-[11px] px-3 py-1 rounded-full border transition capitalize ${
                        postForm.category === cat ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]" : "border-[#3A3A52] text-[#A8A6B8]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Upload Actions Deck */}
              <div className="flex items-center justify-between border-t border-[#3A3A52]/50 pt-3 mt-1">
                <div className="flex items-center gap-1">
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
                    className="p-2 text-[#C9A84C] hover:bg-[#C9A84C10] rounded-full transition"
                  >
                    {uploadingImage ? <Loader2 size={18} className="animate-spin text-[#5C5A70]" /> : <ImageIcon size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => isPremium && setPostForm({ ...postForm, is_anonymous: !postForm.is_anonymous })}
                    className={`p-2 rounded-full transition ${postForm.is_anonymous ? 'text-purple-400 bg-purple-500/10' : 'text-[#5C5A70]'}`}
                    title="Toggle anonymity"
                  >
                    {postForm.is_anonymous ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  onClick={submitPost}
                  disabled={!postForm.content.trim() || submitting || uploadingImage}
                  className={`px-5 font-semibold text-xs py-2 rounded-full transition ${
                    postForm.content.trim() && !submitting && !uploadingImage
                      ? "bg-[#C9A84C] text-[#1A1A2E]" : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                  }`}
                >
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>

              {postError && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2 mt-1">
                  {postError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}