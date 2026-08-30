"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import { Search, Briefcase, MapPin, CheckCircle2, MessageCircle, Star, Filter, ShieldCheck, User, Loader2 } from "lucide-react";
import MatchScoreBadge from "@/components/MatchScoreBadge";

type TalentProfile = {
  id: string;
  full_name: string;
  username: string;
  role: string;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  category?: string | null;
  is_verified?: boolean;
  subscription_tier?: string;
  trust_score?: number;
};

const SKILL_TAGS = ["All", "Web3", "Web2", "Solidity", "React", "Rust", "Node.js", "Python", "AI/ML", "Design"];

export default function TalentSearchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          setCurrentUser(profile);
        }

        const res = await fetch("/api/talent/search");
        if (res.ok) {
          const data = await res.json();
          setTalents(data || []);
        }
      } catch (err) {
        console.error("Talent fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [supabase]);

  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      const matchSearch =
        !search ||
        t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.username?.toLowerCase().includes(search.toLowerCase()) ||
        t.bio?.toLowerCase().includes(search.toLowerCase());

      const matchTag =
        selectedTag === "All" ||
        t.category?.toLowerCase() === selectedTag.toLowerCase() ||
        t.bio?.toLowerCase().includes(selectedTag.toLowerCase());

      return matchSearch && matchTag;
    });
  }, [talents, search, selectedTag]);

  return (
    <DashboardShell role={currentUser?.role} fullName={currentUser?.full_name} username={currentUser?.username}>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3A3A52] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#C9A84C] uppercase tracking-widest mb-1">
              <Briefcase size={14} /> Candidate Matrix
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F3ED]">
              Recruiter & Founder Talent Search
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] mt-1">
              Discover and recruit verified Web2 & Web3 tech talent, engineers, and startup builders globally.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C5A70]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search talent by name, skills, bio, or role..."
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-sm text-[#F5F3ED] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {SKILL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedTag === tag
                    ? "bg-[#C9A84C] text-[#1A1A2E]"
                    : "bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : filteredTalents.length === 0 ? (
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto">
            <User size={40} className="text-[#5C5A70] mx-auto" />
            <h3 className="text-base font-bold text-[#F5F3ED]">No candidates found</h3>
            <p className="text-xs text-[#A8A6B8]">Try adjusting your search query or skill filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalents.map((talent) => (
              <div
                key={talent.id}
                className="bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C]/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {talent.avatar_url ? (
                        <img
                          src={talent.avatar_url}
                          alt={talent.full_name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#3A3A52]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] flex items-center justify-center text-[#C9A84C] font-bold text-lg">
                          {talent.full_name?.charAt(0) || "T"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-[#F5F3ED]">{talent.full_name}</h3>
                          {talent.is_verified && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-[#5C5A70]">@{talent.username}</p>
                      </div>
                    </div>

                    <MatchScoreBadge profile={currentUser} target={talent} />
                  </div>

                  <p className="text-xs text-[#A8A6B8] line-clamp-2 leading-relaxed">
                    {talent.bio || "Verified REACH tech talent profile."}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5C5A70]">
                    {talent.country && (
                      <span className="flex items-center gap-1 bg-[#0F0F1A] px-2.5 py-1 rounded-lg border border-[#3A3A52]">
                        <MapPin size={11} className="text-[#C9A84C]" /> {talent.country}
                      </span>
                    )}
                    {talent.subscription_tier && (
                      <span className="uppercase font-bold text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded border border-[#C9A84C]/20">
                        {talent.subscription_tier}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/dashboard/chats?user=${talent.id}`)}
                  className="w-full py-2.5 rounded-xl bg-[#C9A84C] hover:opacity-90 text-[#1A1A2E] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageCircle size={14} /> Message Candidate
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
