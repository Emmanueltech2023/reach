"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import {
  Camera, CheckCircle, Globe, X,
  Link2, MapPin, Loader2, Save, Edit2,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INVESTMENT_FOCUS_OPTIONS = [
  "FinTech","HealthTech","EdTech","AgriTech","DeFi",
  "NFT","DAO","Infrastructure","E-commerce","SaaS","AI/ML","CleanTech",
];

type Profile = {
  id: string;
  full_name: string;
  username: string;
  phone: string;
  role: string;
  category: string;
  bio: string;
  website: string;
  linkedin: string;
  twitter: string;
  country: string;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  kyc_status: string;
  trust_score: number;
  investment_focus: string[];
  min_ticket_size: number | null;
  max_ticket_size: number | null;
  total_invested: number | null;
  subscription_tier: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    website: "",
    linkedin: "",
    twitter: "",
    country: "",
    investment_focus: [] as string[],
    min_ticket_size: "",
    max_ticket_size: "",
  });

  // Define fetchProfile outside to use in other handlers
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        bio: data.bio || "",
        website: data.website || "",
        linkedin: data.linkedin || "",
        twitter: data.twitter || "",
        country: data.country || "",
        investment_focus: data.investment_focus || [],
        min_ticket_size: data.min_ticket_size?.toString() || "",
        max_ticket_size: data.max_ticket_size?.toString() || "",
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      await fetchProfile();
    };

    if (isMounted) {
      void loadProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "banner"
  ) => {
    const preview = URL.createObjectURL(file);
    if (type === "avatar") setAvatarPreview(preview);
    else setBannerPreview(preview);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "avatars");
    formData.append("path", `${type}-${profile?.id}`);

    const res = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });
    const { url } = await res.json();

    await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile?.id,
        updates: type === "avatar" ? { avatar_url: url } : { banner_url: url },
      }),
    });
  };

  const toggleFocus = (focus: string) => {
    setForm((prev) => ({
      ...prev,
      investment_focus: prev.investment_focus.includes(focus)
        ? prev.investment_focus.filter((f) => f !== focus)
        : [...prev.investment_focus, focus],
    }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        updates: {
          full_name: form.full_name,
          bio: form.bio,
          website: form.website,
          linkedin: form.linkedin,
          twitter: form.twitter,
          country: form.country,
          investment_focus: form.investment_focus,
          min_ticket_size: form.min_ticket_size
            ? parseFloat(form.min_ticket_size)
            : null,
          max_ticket_size: form.max_ticket_size
            ? parseFloat(form.max_ticket_size)
            : null,
        },
      }),
    });

    await fetchProfile();
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardShell role={profile?.role as "investor" | "builder" || "investor"}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={profile?.role as "investor" | "builder" || "investor"}
      fullName={profile?.full_name}
      username={profile?.username}
      avatarUrl={avatarPreview || profile?.avatar_url}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Banner */}
        <div className="relative w-full h-36 rounded-xl overflow-hidden bg-linear-to-br from-[#1A1A2E] to-[#2A1A3E]">
          {(bannerPreview || profile?.banner_url) && (
            <Image
              src={bannerPreview || profile?.banner_url || ""}
              alt="Banner"
              fill
              className="object-cover"
              unoptimized
            />
          )}
          {editing && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer">
              <Camera size={20} className="text-white" />
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "banner")} />
            </label>
          )}
        </div>

        {/* Avatar + name row */}
        <div className="flex items-end gap-4 -mt-10 px-2">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-[#0F0F1A] bg-[#C9A84C20] flex items-center justify-center overflow-hidden relative">
              {(avatarPreview || profile?.avatar_url) ? (
                <Image
                  src={avatarPreview || profile?.avatar_url || ""}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-medium text-[#C9A84C]">
                  {profile?.full_name?.[0] || "?"}
                </span>
              )}
            </div>
            {editing && (
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#C9A84C] rounded-full flex items-center justify-center cursor-pointer">
                <Camera size={14} className="text-[#1A1A2E]" />
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "avatar")} />
              </label>
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[#F5F3ED] text-lg font-medium">
                {profile?.full_name}
              </h1>
              {profile?.is_verified && (
                <CheckCircle size={16} className="text-emerald-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#5C5A70]">
              <span>@{profile?.username}</span>
              <span>·</span>
              <span className="capitalize">{profile?.role}</span>
              {profile?.country && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />{profile.country}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => editing ? void handleSave() : setEditing(true)}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              editing
                ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                : "border border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
            }`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : editing ? (
              <><Save size={14} /> Save</>
            ) : (
              <><Edit2 size={14} /> Edit</>
            )}
          </button>
        </div>

        {/* KYC + subscription status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  
  {/* Left Column: Status Indicators */}
  <div className="flex flex-col gap-3">
    {/* KYC Status */}
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
      profile?.kyc_status === "approved"
        ? "bg-emerald-900/10 text-emerald-400 border-emerald-900/50"
        : "bg-yellow-900/10 text-yellow-400 border-yellow-900/50"
    }`}>
      <CheckCircle size={16} />
      KYC {profile?.kyc_status === "approved" ? "Verified" : "Pending"}
    </div>

    {/* Trust Score */}
    {profile && profile.trust_score > 0 && (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] text-sm">
        <span>⭐</span>
        <span className="font-medium text-[#F5F3ED]">{profile.trust_score.toFixed(1)}</span>
        <span className="text-[#5C5A70]">Trust Score</span>
      </div>
    )}
  </div>

  {/* Right Column: Subscription (Spans full width on mobile if needed) */}
  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5 flex flex-col justify-center">
    <h2 className="text-[#F5F3ED] text-xs uppercase tracking-wider font-semibold mb-3">Subscription</h2>
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[#F5F3ED] text-sm font-medium capitalize">
          {profile?.subscription_tier || "Free"} Plan
        </div>
        <div className="text-[#5C5A70] text-[11px] mt-0.5">
          {profile?.subscription_tier === "free" || !profile?.subscription_tier
            ? "Upgrade to unlock features"
            : "Active premium access"}
        </div>
      </div>
      
      {(profile?.subscription_tier === "free" || !profile?.subscription_tier) ? (
        <button
          onClick={() => router.push("/dashboard/upgrade")}
          className="bg-[#C9A84C] text-[#1A1A2E] text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-all shrink-0"
        >
          Upgrade
        </button>
      ) : (
        <span className="text-[10px] px-3 py-1 rounded-full bg-[#C9A84C10] text-[#C9A84C] border border-[#C9A84C20] font-bold uppercase">
          {profile.subscription_tier}
        </span>
      )}
    </div>
  </div>
  
</div>

        {/* Bio */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">About</h2>
          {editing ? (
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              placeholder="Tell investors or builders about yourself…"
              className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none"
            />
          ) : (
            <p className="text-[#A8A6B8] text-sm leading-relaxed">
              {profile?.bio || "No bio yet. Click Edit to add one."}
            </p>
          )}
        </div>

        {/* Basic info */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
          <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">Details</h2>
          <div className="flex flex-col gap-3">
            {editing ? (
              <>
                <div>
                  <label className="text-[#A8A6B8] text-xs mb-1.5 block">Full Name</label>
                  <input value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition" />
                </div>
                <div>
                  <label className="text-[#A8A6B8] text-xs mb-1.5 block">Country</label>
                  <input value={form.country} placeholder="e.g. Nigeria"
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
                </div>
                <div>
                  <label className="text-[#A8A6B8] text-xs mb-1.5 block">Website</label>
                  <input value={form.website} placeholder="https://yoursite.com"
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#A8A6B8] text-xs mb-1.5 block">Twitter / X</label>
                    <input value={form.twitter} placeholder="@handle"
                      onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                      className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
                  </div>
                  <div>
                    <label className="text-[#A8A6B8] text-xs mb-1.5     block">LinkedIn</label>
                    <input value={form.linkedin} placeholder="linkedin.com/in/you"
                      onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                      className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {profile?.country && (
                  <div className="flex items-center gap-2 text-sm text-[#A8A6B8]">
                    <MapPin size={14} className="text-[#5C5A70]" />
                    {profile.country}
                  </div>
                )}
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#A8A6B8] hover:text-[#C9A84C] transition">
                    <Globe size={14} className="text-[#5C5A70]" />
                    {profile.website}
                  </a>
                )}
                {profile?.twitter && (
                  <a href={`https://twitter.com/${profile.twitter.replace("@","")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#A8A6B8] hover:text-[#C9A84C] transition">
                    <X size={14} className="text-[#5C5A70]" />
                    {profile.twitter}
                  </a>
                )}
                {profile?.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#A8A6B8] hover:text-[#C9A84C] transition">
                    <Link2 size={14} className="text-[#5C5A70]" />
                    {profile.linkedin}
                  </a>
                )}
                {!profile?.country && !profile?.website && !profile?.twitter && !profile?.linkedin && (
                  <p className="text-[#5C5A70] text-sm">No details yet. Click Edit to add.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Investor-specific: investment focus + ticket size */}
        {profile?.role === "investor" && (
          <>
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
              <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">
                Investment focus
              </h2>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {INVESTMENT_FOCUS_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFocus(f)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        form.investment_focus.includes(f)
                          ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]"
                          : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile && profile.investment_focus?.length > 0 ? (
                    profile.investment_focus.map((f) => (
                      <span key={f}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#C9A84C30] bg-[#C9A84C10] text-[#C9A84C]">
                        {f}
                      </span>
                    ))
                  ) : (
                    <p className="text-[#5C5A70] text-sm">
                      No focus areas set. Click Edit to add.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
              <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">
                Ticket size
              </h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#A8A6B8] text-xs mb-1.5 block">Minimum (USD)</label>
                    <input
                      type="number"
                      value={form.min_ticket_size}
                      onChange={(e) => setForm({ ...form, min_ticket_size: e.target.value })}
                      placeholder="e.g. 10000"
                      className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                    />
                  </div>
                  <div>
                    <label className="text-[#A8A6B8] text-xs mb-1.5 block">Maximum (USD)</label>
                    <input
                      type="number"
                      value={form.max_ticket_size}
                      onChange={(e) => setForm({ ...form, max_ticket_size: e.target.value })}
                      placeholder="e.g. 500000"
                      className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-[#5C5A70]" />
                  <span className="text-[#A8A6B8] text-sm">
                    {profile?.min_ticket_size && profile?.max_ticket_size
                      ? `$${profile.min_ticket_size.toLocaleString()} – $${profile.max_ticket_size.toLocaleString()}`
                      : "Not set"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Danger zone */}
        <div className="bg-[#1A1A2E] border border-red-900/30 rounded-xl p-4">
          <h2 className="text-red-400 text-sm font-medium mb-3">Account</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition w-fit"
            >
              Sign out of iVest
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}