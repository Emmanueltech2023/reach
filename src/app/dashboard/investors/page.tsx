"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Search, MessageCircle, CheckCircle,
  TrendingUp, MapPin, Loader2, Filter, ShieldCheck, 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Investor = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  country: string | null;
  bio: string | null;
  investment_focus: string[] | null;
  min_ticket_size: number | null;
  max_ticket_size: number | null;
  total_invested: number | null;
  trust_score: number;
  banner_url: string | null;
};

const AVATAR_COLORS = [
  "bg-emerald-900 text-emerald-300",
  "bg-blue-900 text-blue-300",
  "bg-purple-900 text-purple-300",
  "bg-orange-900 text-orange-300",
  "bg-indigo-900 text-indigo-300",
];

function getColor(id: string) {
  if (!id) return AVATAR_COLORS[0];
  return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

const FOCUS_FILTERS = ["All", "FinTech", "HealthTech", "DeFi", "EdTech", "AI/ML", "Web3", "SaaS"];

export default function InvestorDiscoveryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }, [supabase]);

  // Wrapped in useCallback to prevent infinite render loops and dependency leakage
  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    
    // Note: For full production mitigation against client network eavesdropping, 
    // it is strongly recommended to handle this mapping via an API route endpoint or Postgres View.
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, is_verified, country, bio, investment_focus, min_ticket_size, max_ticket_size, total_invested, trust_score, banner_url, is_anonymous")
      .eq("role", "investor")
      .order("created_at", { ascending: false });

    const masked = (data || []).map((inv) => {
      if (inv.is_anonymous) {
        return {
          ...inv,
          full_name: "Anonymous Investor",
          username: "anonymous",
          avatar_url: null,
          banner_url: null,
          country: null,
          linkedin: null,
          twitter: null,
          website: null,
          bio: "This premium institutional investor is operating in anonymous mode.",
        };
      }
      return inv;
    });

    setInvestors(masked);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const initData = async () => {
      await fetchInvestors();
      await fetchCurrentUser();
    };
    void initData();
  }, [fetchCurrentUser, fetchInvestors]);

  const startChat = async (investorId: string) => {
    if (!currentUserId) return;

    const res = await fetch("/api/conversations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        otherUserId: investorId,
      }),
    });
    const { conversationId } = await res.json();
    router.push(`/dashboard/chats?conversationId=${conversationId}`);
  };

  const filtered = investors.filter((inv) => {
    const matchSearch =
      inv.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.bio && inv.bio.toLowerCase().includes(search.toLowerCase())) ||
      (inv.country && inv.country.toLowerCase().includes(search.toLowerCase())) ||
      inv.investment_focus?.some((f) =>
        f.toLowerCase().includes(search.toLowerCase())
      );

    const matchFilter =
      activeFilter === "All" ||
      inv.investment_focus?.some(f => f.toLowerCase() === activeFilter.toLowerCase());

    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#F5F3ED] antialiased">
      <header className="sticky top-0 z-40 bg-[#0F0F1A]/90 backdrop-blur-md border-b border-[#3A3A52]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className="p-2 hover:bg-[#1A1A2E] border border-transparent hover:border-[#3A3A52]/60 rounded-xl transition-all duration-200"
            >
              <ArrowLeft size={18} className="text-[#A8A6B8]" />
            </button>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-[#F5F3ED]">
              Investor Directory
            </h1>
          </div>
          <button className="p-2 hover:bg-[#1A1A2E] border border-[#3A3A52]/60 rounded-xl transition md:hidden">
            <Filter size={16} className="text-[#A8A6B8]" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-[#1A1A2E]/30 p-4 rounded-xl border border-[#3A3A52]/50 backdrop-blur-xs">
          <div className="flex-1 max-w-md flex items-center gap-3 bg-[#0F0F1A] border border-[#3A3A52]/80 rounded-lg px-3.5 py-2.5 focus-within:border-[#C9A84C] focus-within:ring-1 focus-within:ring-[#C9A84C]/20 transition-all duration-200">
            <Search size={15} className="text-[#5C5A70] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, focus network, country..."
              className="flex-1 bg-transparent text-xs outline-none placeholder-[#5C5A70] text-[#F5F3ED]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-none] [&::-webkit-scrollbar]:hidden lg:max-w-2xl py-0.5">
            {FOCUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`shrink-0 text-[11px] uppercase tracking-wider px-4 py-2 rounded-md border font-semibold transition-all duration-150 ${
                  activeFilter === f
                    ? "bg-[#C9A84C] text-[#1A1A2E] border-[#C9A84C] shadow-md shadow-[#C9A84C]/10"
                    : "border-[#3A3A52]/60 text-[#A8A6B8] hover:border-[#5C5A70] hover:text-[#F5F3ED] bg-[#1A1A2E]/40"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 size={26} className="text-[#C9A84C] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-[#1A1A2E]/10 rounded-2xl border border-dashed border-[#3A3A52]/60 p-6">
              <TrendingUp size={36} className="text-[#3A3A52]" />
              <p className="text-[#5C5A70] text-xs text-center max-w-xs leading-relaxed">
                No matching institutional or angel capital networks conform to the applied parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((inv) => (
                <div
                  key={inv.id}
                  className="group bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#5C5A70] rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-black/20"
                >
                  <div>
                    <div className="h-32 overflow-hidden relative border-b border-[#3A3A52]/30 bg-[#1A1A2E]">
                      {inv.banner_url ? (
                        <Image
                          src={inv.banner_url}
                          alt="Investment banner"
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-[#1A1A2E] via-[#231E3D] to-[#0F0F1A]" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-[#1A1A2E] via-[#1A1A2E]/40 to-black/20" />
                    </div>

                    <div className="p-5 -mt-12 relative z-10">
                      <div className="flex items-end justify-between mb-4">
                        <div className={`w-20 h-20 rounded-2xl border-4 border-[#1A1A2E] flex items-center justify-center text-xl font-bold shrink-0 shadow-xl overflow-hidden bg-[#1A1A2E] ${getColor(inv.id)}`}>
                          {inv.avatar_url ? (
                            <Image
                              src={inv.avatar_url}
                              alt={inv.full_name}
                              width={80}
                              height={80}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(inv.full_name)
                          )}
                        </div>
                        
                        <button
                          onClick={() => startChat(inv.id)}
                          className="flex items-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg hover:bg-[#b5953e] transition duration-150 shadow-md shadow-[#C9A84C]/10"
                        >
                          <MessageCircle size={13} />
                          Pitch
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[#F5F3ED] text-base font-semibold truncate group-hover:text-[#C9A84C] transition duration-150">
                            {inv.full_name}
                          </span>
                          {inv.is_verified && (
                            <CheckCircle size={14} className="text-emerald-400 fill-emerald-400/10 shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[#5C5A70] text-[11px]">
                          <span className="font-medium">@{inv.username}</span>
                          {inv.country && (
                            <>
                              <span className="text-[#3A3A52] font-bold">·</span>
                              <span className="flex items-center gap-0.5 text-[#A8A6B8]">
                                <MapPin size={11} className="text-[#5C5A70]" />
                                {inv.country}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {inv.bio && (
                        <p className="text-[#A8A6B8] text-xs leading-relaxed mt-4 line-clamp-2 min-h-9">
                          {inv.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-[#3A3A52]/30 bg-[#141426]/60">
                    <div className="grid grid-cols-3 gap-2 text-left">
                      <div className="bg-[#0F0F1A]/50 rounded-lg p-2 border border-[#3A3A52]/20">
                        <div className="text-[#F5F3ED] text-[11px] font-bold truncate">
                          {inv.min_ticket_size && inv.max_ticket_size 
                            ? `${formatCurrency(inv.min_ticket_size)}–${formatCurrency(inv.max_ticket_size)}`
                            : "—"
                          }
                        </div>
                        <div className="text-[#5C5A70] text-[9px] uppercase tracking-wider font-bold mt-0.5">Ticket</div>
                      </div>

                      <div className="bg-[#0F0F1A]/50 rounded-lg p-2 border border-[#3A3A52]/20">
                        <div className="text-[#C9A84C] text-[11px] font-bold flex items-center gap-0.5">
                          {inv.trust_score > 0 ? (
                            <>
                              <ShieldCheck size={11} className="text-[#C9A84C]" />
                              {inv.trust_score.toFixed(1)}
                            </>
                          ) : "—"}
                        </div>
                        <div className="text-[#5C5A70] text-[9px] uppercase tracking-wider font-bold mt-0.5">Trust</div>
                      </div>

                      <div className="bg-[#0F0F1A]/50 rounded-lg p-2 border border-[#3A3A52]/20">
                        <div className="text-[#F5F3ED] text-[11px] font-bold truncate">
                          {inv.total_invested && inv.total_invested > 0 ? formatCurrency(inv.total_invested) : "—"}
                        </div>
                        <div className="text-[#5C5A70] text-[9px] uppercase tracking-wider font-bold mt-0.5">Invested</div>
                      </div>
                    </div>

                    {inv.investment_focus && inv.investment_focus.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3.5 h-5 overflow-hidden items-center">
                        {inv.investment_focus.slice(0, 3).map((f) => (
                          <span 
                            key={f}
                            className="text-[9px] px-2 py-0.5 rounded-sm bg-[#C9A84C]/5 border border-[#C9A84C]/20 text-[#C9A84C] font-bold uppercase tracking-wider"
                          >
                            {f}
                          </span>
                        ))}
                        {inv.investment_focus.length > 3 && (
                          <span className="text-[10px] text-[#5C5A70] font-semibold pl-0.5">
                            +{inv.investment_focus.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}