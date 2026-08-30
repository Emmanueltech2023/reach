"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import UpgradeGate from "@/components/UpgradeGate";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Camera, CheckCircle, CheckCircle2, Globe, X,
  Link2, MapPin, Loader2, Save, Edit2,
  DollarSign, Zap, Sparkles, Eye, EyeOff, ShieldCheck,
  Mail, Smartphone, Clock, AlertCircle, Star
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WalletConnect from "@/components/WalletConnect";
import { useCurrency } from "@/components/CurrencyProvider";
import { getSupportedCurrencies } from "@/lib/currency";
import TierBadge from "@/components/TierBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import KycModal from "@/components/KycModal";
import EmailVerificationModal from "@/components/EmailVerificationModal";

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
  wallet_address: string | null;
  wallet_verified: boolean;
  is_anonymous?: boolean;
  is_scam?: boolean;
  is_banned?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { features } = useSubscription();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Verification Modals State
  const [showKycModal, setShowKycModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const toggleAnonymousMode = async () => {
    if (!profile) return;
    const newStatus = !profile.is_anonymous;
    setProfile({ ...profile, is_anonymous: newStatus });
    await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        updates: { is_anonymous: newStatus },
      }),
    });
  };
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
    preferred_currency: "",
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
        preferred_currency: (data as any).preferred_currency || "USD",
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
    const data = await res.json();
    const url = data.url;

    if (url) {
      if (type === "avatar") {
        setAvatarPreview(url);
        setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      } else {
        setBannerPreview(url);
        setProfile((prev) => (prev ? { ...prev, banner_url: url } : prev));
      }

      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.id,
          updates: type === "avatar" ? { avatar_url: url } : { banner_url: url },
        }),
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: {
              avatar_url: type === "avatar" ? url : profile?.avatar_url,
              full_name: profile?.full_name,
              username: profile?.username,
              role: profile?.role,
            },
          })
        );
      }
    }
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
          preferred_currency: form.preferred_currency,
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

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: {
            full_name: form.full_name,
            username: profile.username,
            avatar_url: avatarPreview || profile.avatar_url,
            role: profile.role,
          },
        })
      );
    }
  };

  if (loading) {
    return (
      <DashboardShell role={profile?.role}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      role={profile?.role}
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[#F5F3ED] text-lg font-medium">
                {profile?.full_name}
              </h1>
              <VerifiedBadge tier={profile?.subscription_tier} isVerified={profile?.is_verified} isScam={profile?.is_scam} isBanned={profile?.is_banned} size={18} />
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
    {/* KYC Document Verification */}
    <button
      type="button"
      onClick={() => setShowKycModal(true)}
      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
        profile?.kyc_status === "approved"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          : profile?.kyc_status === "pending"
          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
          : profile?.kyc_status === "rejected"
          ? "bg-red-500/10 text-red-400 border-red-500/30"
          : "bg-[#1A1A2E] border-[#3A3A52] text-[#A8A6B8] hover:border-[#C9A84C]"
      }`}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className={profile?.kyc_status === "approved" ? "text-emerald-400" : profile?.kyc_status === "pending" ? "text-amber-400 animate-pulse" : "text-[#C9A84C]"} />
        <span>
          KYC Documents: {
            profile?.kyc_status === "approved"
              ? "Verified"
              : profile?.kyc_status === "pending"
              ? "Pending Review"
              : profile?.kyc_status === "rejected"
              ? "Rejected (Click to Resubmit)"
              : "Submit Identity Documents"
          }
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {profile?.kyc_status === "approved" ? (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Verified
          </span>
        ) : profile?.kyc_status === "pending" ? (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 animate-pulse">
            <Clock size={12} className="text-amber-400 animate-spin" />
            Pending
          </span>
        ) : (
          <span className="text-[10px] uppercase font-bold text-[#C9A84C]">Manage</span>
        )}
      </div>
    </button>

    {/* Email OTP Verification */}
    <button
      type="button"
      onClick={() => {
        if (!((profile as any)?.email_verified || profile?.is_verified)) {
          setShowEmailModal(true);
        }
      }}
      disabled={Boolean((profile as any)?.email_verified || profile?.is_verified)}
      className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-xs font-semibold border transition ${
        ((profile as any)?.email_verified || profile?.is_verified)
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default"
          : "bg-[#1A1A2E] border-[#3A3A52] text-[#A8A6B8] hover:border-[#C9A84C] cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-2">
        <Mail size={16} className={((profile as any)?.email_verified || profile?.is_verified) ? "text-emerald-400" : "text-[#A8A6B8]"} />
        <span>
          Email Address
        </span>
      </div>
      {((profile as any)?.email_verified || profile?.is_verified) ? (
        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400">
          <CheckCircle2 size={12} className="text-emerald-400" />
          Verified
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 animate-pulse">
          <Clock size={12} className="text-amber-400" />
          Verify Email
        </span>
      )}
    </button>

    {/* Trust Score */}
    {profile && profile.trust_score > 0 && (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] text-sm">
        <Star size={16} className="text-[#C9A84C] fill-current shrink-0" />
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
          {(profile?.subscription_tier || features.tier || "free").toLowerCase() === "free" ? "Free" : (profile?.subscription_tier || features.tier || "free").toUpperCase()} Plan
        </div>
        <div className="text-[#5C5A70] text-[11px] mt-0.5">
          {(profile?.subscription_tier || features.tier || "free").toLowerCase() === "free"
            ? "Upgrade to unlock advanced features"
            : "Active subscription plan"}
        </div>
      </div>
      
      {(profile?.subscription_tier || features.tier || "free").toLowerCase() === "free" ? (
        <button
          onClick={() => router.push("/dashboard/upgrade")}
          className="bg-[#C9A84C] text-[#1A1A2E] text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-all shrink-0"
        >
          Upgrade
        </button>
      ) : (
        <span className="text-[10px] px-3 py-1 rounded-full bg-[#C9A84C10] text-[#C9A84C] border border-[#C9A84C20] font-bold uppercase">
          {profile?.subscription_tier || features.tier}
        </span>
      )}
    </div>
  </div>

  {/* Web3 Wallet */}
<div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
  <h2 className="text-[#F5F3ED] text-sm font-medium mb-3">Web3 Wallet</h2>
  {profile && (
    <WalletConnect
      userId={profile.id}
      onConnected={(address) => {
        setProfile((prev) => prev ? { ...prev, wallet_address: address } : prev);
      }}
    />
  )}
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
                  <label className="text-[#A8A6B8] text-xs mb-1.5 block">Preferred Currency</label>
                  <select value={form.preferred_currency}
                    onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                    className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition">
                    {getSupportedCurrencies().map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
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
                {(profile as any)?.preferred_currency && (
                  <div className="flex items-center gap-2 text-sm text-[#A8A6B8]">
                    <DollarSign size={14} className="text-[#5C5A70]" />
                    Currency: {(profile as any).preferred_currency}
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

        {/* Anonymous Mode (Investor only) */}
        {profile?.role === "investor" && (
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C15] border border-[#C9A84C30] flex items-center justify-center">
                  {profile.is_anonymous ? <EyeOff size={18} className="text-[#C9A84C]" /> : <Eye size={18} className="text-[#C9A84C]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[#F5F3ED] text-sm font-medium">Anonymous Investor Mode</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-[#C9A84C20] text-[#C9A84C] border-[#C9A84C30] font-medium">
                      Premium
                    </span>
                  </div>
                  <p className="text-[#5C5A70] text-xs mt-0.5">
                    Hide your name, photo, and company from founders while keeping your verified badge intact.
                  </p>
                </div>
              </div>

              {features.canBrowseAnonymously ? (
                <button
                  onClick={toggleAnonymousMode}
                  className={`w-12 h-6 rounded-full transition relative p-1 ${
                    profile.is_anonymous ? "bg-[#C9A84C]" : "bg-[#3A3A52]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#1A1A2E] transition transform ${
                      profile.is_anonymous ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              ) : (
                <button
                  onClick={() => router.push("/dashboard/upgrade")}
                  className="text-xs text-[#C9A84C] border border-[#C9A84C30] bg-[#C9A84C10] px-3 py-1.5 rounded-lg hover:bg-[#C9A84C20] transition font-medium"
                >
                  Upgrade
                </button>
              )}
            </div>
            {profile.is_anonymous && (
              <div className="bg-[#C9A84C10] border border-[#C9A84C25] text-[#C9A84C] text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0" />
                <span>Anonymous Mode is Active. Your identity is hidden in public browsing & feeds.</span>
              </div>
            )}
          </div>
        )}

        {/* Subscription Tier Details */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                features.tier === "premium"
                  ? "bg-[#C9A84C15] border border-[#C9A84C30] text-[#C9A84C]"
                  : features.tier === "pro"
                  ? "bg-blue-900/30 border border-blue-800 text-blue-400"
                  : "bg-[#0A0A0F] border border-[#3A3A52] text-[#5C5A70]"
              }`}>
                {features.tier === "premium" ? <Sparkles size={18} /> : features.tier === "pro" ? <Zap size={18} /> : <ShieldCheck size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[#F5F3ED] text-sm font-medium">Subscription Plan</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold capitalize ${
                    features.tier === "premium"
                      ? "bg-[#C9A84C20] text-[#C9A84C] border-[#C9A84C30]"
                      : features.tier === "pro"
                      ? "bg-blue-900/30 text-blue-400 border-blue-800"
                      : "bg-[#0A0A0F] text-[#5C5A70] border-[#3A3A52]"
                  }`}>
                    {features.tier}
                  </span>
                </div>
                <p className="text-[#5C5A70] text-xs mt-0.5">
                  {features.tier === "premium"
                    ? "Full access to AI startup scoring, deal rooms & anonymous mode."
                    : features.tier === "pro"
                    ? "Unlimited messaging, meeting booking & analytics access."
                    : "Free tier access with standard messaging and search limits."}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard/upgrade")}
              className="text-xs font-medium text-[#F5F3ED] bg-[#0A0A0F] border border-[#3A3A52] px-3.5 py-2 rounded-xl hover:border-[#C9A84C] transition"
            >
              {features.tier === "premium" ? "Manage Plan" : "Upgrade Plan"}
            </button>
          </div>
        </div>

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
              Sign out of REACH
            </button>
          </div>
        </div>

        {/* Verification Modals */}
        {profile && (
          <>
            <KycModal
              isOpen={showKycModal}
              onClose={() => setShowKycModal(false)}
              userId={profile.id}
              userRole={profile.role}
              onSuccess={() => void fetchProfile()}
            />

            <EmailVerificationModal
              isOpen={showEmailModal}
              onClose={() => setShowEmailModal(false)}
              userId={profile.id}
              userEmail={userEmail || profile.id}
              onSuccess={() => void fetchProfile()}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}