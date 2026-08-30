"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  MapPin,
  ShieldCheck,
  MessageCircle,
  Globe,
  Share2,
  ExternalLink,
  DollarSign,
  Briefcase,
  Layers,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Star
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import TierBadge from "@/components/TierBadge";
import { formatCurrency } from "@/lib/currency";

export interface UserProfileData {
  id: string;
  full_name: string;
  username: string;
  role?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  country?: string | null;
  is_verified?: boolean;
  is_scam?: boolean;
  is_banned?: boolean;
  trust_score?: number;
  subscription_tier?: string | null;
  investment_focus?: string[] | null;
  min_ticket_size?: number | null;
  max_ticket_size?: number | null;
  total_invested?: number | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  category?: string | null;
}

interface UserProfileModalProps {
  user: UserProfileData | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-emerald-900 text-emerald-300 border-emerald-500/40",
  "bg-blue-900 text-blue-300 border-blue-500/40",
  "bg-purple-900 text-purple-300 border-purple-500/40",
  "bg-orange-900 text-orange-300 border-orange-500/40",
  "bg-indigo-900 text-indigo-300 border-indigo-500/40",
];

function getColor(id: string) {
  if (!id) return AVATAR_COLORS[0];
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
  currentUserId,
}: UserProfileModalProps) {
  const router = useRouter();
  const [startingChat, setStartingChat] = useState(false);

  if (!isOpen || !user) return null;

  const handleStartChat = async () => {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }
    if (currentUserId === user.id) return;

    setStartingChat(true);
    try {
      const res = await fetch("/api/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          otherUserId: user.id,
        }),
      });
      const data = await res.json();
      if (data.conversationId) {
        onClose();
        router.push(`/dashboard/chats?conversationId=${data.conversationId}`);
      }
    } catch (err) {
      console.error("Failed to start chat from profile modal:", err);
    } finally {
      setStartingChat(false);
    }
  };

  const isInvestor = user.role === "investor" || (user.investment_focus && user.investment_focus.length > 0);
  const isBuilder = user.role === "builder";
  const isTalent = user.role === "talent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0F0F1A] border border-[#3A3A52] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header / Banner */}
        <div className="relative h-28 sm:h-36 bg-gradient-to-r from-[#1A1A2E] via-[#252542] to-[#1A1A2E] border-b border-[#3A3A52]">
          {user.banner_url ? (
            <Image
              src={user.banner_url}
              alt="Profile banner"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A84C]/10 via-[#1A1A2E] to-[#C9A84C]/10" />
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 text-[#A8A6B8] hover:text-[#F5F3ED] bg-[#0F0F1A]/70 hover:bg-[#0F0F1A] border border-[#3A3A52] rounded-full transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Content Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 -mt-10 sm:-mt-12 relative z-10">
          
          {/* Avatar and Top Actions */}
          <div className="flex items-end justify-between gap-4">
            <div className="relative">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[#0F0F1A] flex items-center justify-center text-xl sm:text-2xl font-bold shadow-2xl overflow-hidden ${getColor(
                  user.id
                )}`}
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name}
                    width={96}
                    height={96}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(user.full_name)
                )}
              </div>
            </div>

            {/* Direct Message Action CTA */}
            {currentUserId !== user.id && (
              <button
                type="button"
                onClick={handleStartChat}
                disabled={startingChat}
                className="flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#b5953e] transition duration-150 shadow-lg shadow-[#C9A84C]/20 cursor-pointer disabled:opacity-50"
              >
                <MessageCircle size={16} />
                <span>{startingChat ? "Opening Chat..." : isInvestor ? "Pitch / Message" : "Direct Message"}</span>
              </button>
            )}
          </div>

          {/* Security Alert if flagged */}
          {user.is_scam && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-200 text-xs">
              <AlertTriangle size={18} className="text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-red-400">⚠️ SCAM ALERT:</span> This user account has been flagged by platform moderation for suspicious behavior. Exercise extreme caution.
              </div>
            </div>
          )}

          {/* Name & Role Details */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-[#F5F3ED]">
                {user.full_name}
              </h2>
              <VerifiedBadge
                tier={user.subscription_tier || undefined}
                isVerified={user.is_verified}
                isScam={user.is_scam}
                isBanned={user.is_banned}
                size={16}
              />
              <TierBadge tier={user.subscription_tier || undefined} />
            </div>

            <div className="flex items-center gap-3 text-[#A8A6B8] text-xs mt-1 flex-wrap">
              <span className="text-[#C9A84C] font-semibold">@{user.username}</span>
              {user.role && (
                <span className="capitalize px-2 py-0.5 rounded-md bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] font-medium text-[11px]">
                  {user.role}
                </span>
              )}
              {user.country && (
                <span className="flex items-center gap-1 text-[#A8A6B8]">
                  <MapPin size={12} className="text-[#5C5A70]" />
                  {user.country}
                </span>
              )}
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-2 bg-[#1A1A2E]/60 border border-[#3A3A52]/40 rounded-xl p-3 text-center">
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#C9A84C] flex items-center justify-center gap-1">
                <Star size={14} className="text-[#C9A84C] fill-current" />
                {user.trust_score ? user.trust_score.toFixed(1) : "N/A"}
              </div>
              <div className="text-[10px] text-[#5C5A70] uppercase font-bold tracking-wider mt-0.5">Trust Score</div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                {isInvestor && user.min_ticket_size && user.max_ticket_size
                  ? `${formatCurrency(user.min_ticket_size)}–${formatCurrency(user.max_ticket_size)}`
                  : user.is_verified
                  ? "Verified"
                  : "Unverified"}
              </div>
              <div className="text-[10px] text-[#5C5A70] uppercase font-bold tracking-wider mt-0.5">
                {isInvestor ? "Ticket Range" : "Verification"}
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                {isInvestor && user.total_invested && user.total_invested > 0
                  ? formatCurrency(user.total_invested)
                  : user.category || "Member"}
              </div>
              <div className="text-[10px] text-[#5C5A70] uppercase font-bold tracking-wider mt-0.5">
                {isInvestor ? "Invested" : "Category"}
              </div>
            </div>
          </div>

          {/* Bio */}
          {user.bio ? (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5A70]">About</h3>
              <p className="text-[#A8A6B8] text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-[#161626] border border-[#3A3A52]/40 rounded-xl p-3.5">
                {user.bio}
              </p>
            </div>
          ) : (
            <div className="text-[#5C5A70] text-xs italic bg-[#161626] border border-[#3A3A52]/40 rounded-xl p-3">
              No bio provided yet.
            </div>
          )}

          {/* Investment Focus Tags if Investor */}
          {user.investment_focus && user.investment_focus.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5A70]">Investment Focus</h3>
              <div className="flex flex-wrap gap-1.5">
                {user.investment_focus.map((focus) => (
                  <span
                    key={focus}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] font-semibold"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(user.website || user.twitter || user.linkedin) && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5A70]">Links</h3>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {user.website && (
                  <a
                    href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#C9A84C] hover:underline bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg"
                  >
                    <Globe size={14} />
                    <span>Website</span>
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={user.twitter.startsWith("http") ? user.twitter : `https://x.com/${user.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#A8A6B8] hover:text-[#F5F3ED] bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg"
                  >
                    <Share2 size={14} />
                    <span>Twitter / X</span>
                  </a>
                )}
                {user.linkedin && (
                  <a
                    href={user.linkedin.startsWith("http") ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#A8A6B8] hover:text-[#F5F3ED] bg-[#1A1A2E] border border-[#3A3A52] px-3 py-1.5 rounded-lg"
                  >
                    <ExternalLink size={14} />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
