"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Shield, Globe, TrendingUp, Users,
  CheckCircle, ArrowRight, ArrowUpRight, ChevronDown,
  Zap, Lock, BarChart2, Quote,
} from "lucide-react";

const STATS = [
  { value: "2,400+", label: "Verified investors" },
  { value: "$48M+", label: "Deals facilitated" },
  { value: "67", label: "Countries" },
  { value: "94%", label: "Match accuracy" },
];

// Real photography, sourced via Lorem Picsum (free-to-use stock photos).
// Swap the seed values for your own licensed assets when you have them.
const IMG = {
  hero: "https://picsum.photos/seed/ivest-hero-2026/1800/1100",
  features: [
    "/images/feat-verify.png",
    "/images/feat-ai.png",
    "/images/feat-globe.png",
    "/images/feat-lock.png",
    "/images/feat-chart.png",
    "/images/feat-forum.png",
  ],
  flow: "/images/vest.jpeg",
  investors: "/images/inves.png",
  builders: "/images/build.png",
  cta: "/images/hero_image.jpg",
  avatars: [
    "https://picsum.photos/seed/ivest-avatar-marcus/200/200",
    "https://picsum.photos/seed/ivest-avatar-amara/200/200",
    "https://picsum.photos/seed/ivest-avatar-david/200/200",
  ],
};

const FEATURES = [
  {
    icon: Shield,
    title: "KYC-verified ecosystem",
    desc: "Every investor and builder is identity-verified before accessing the platform. No anonymous bad actors.",
    span: "row-span-2",
    img: IMG.features[0],
  },
  {
    icon: Zap,
    title: "AI match engine",
    desc: "Our scoring engine matches investors with startups based on sector, ticket size, stage, and trust signals.",
    span: "",
    img: IMG.features[1],
  },
  {
    icon: Globe,
    title: "Truly borderless",
    desc: "Built for emerging markets. West Africa, Southeast Asia, MENA. Capital flows where opportunity is.",
    span: "",
    img: IMG.features[2],
  },
  {
    icon: BarChart2,
    title: "Real-time analytics",
    desc: "Builders see who viewed their pitch, where they're from, and what resonated.",
    span: "",
    img: IMG.features[4],
  },
  {
    icon: Lock,
    title: "Deal pipeline security",
    desc: "NDA → Term Sheet → Agreement → Close. Every stage tracked, every document protected.",
    span: "",
    img: IMG.features[3],
  },
  {
    icon: Users,
    title: "Community forum",
    desc: "A moderated global forum where investors and builders discuss deals, trends, and opportunities.",
    span: "row-span-2",
    img: IMG.features[5],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    role: "Investor",
    title: "Create your verified profile",
    desc: "Complete KYC, set your investment focus areas, ticket size, and sectors.",
  },
  {
    step: "02",
    role: "Investor",
    title: "Get AI-scored matches",
    desc: "Our engine surfaces startups that match your exact investment thesis, scoreing from 0–99.",
  },
  {
    step: "03",
    role: "Both",
    title: "Chat, meet, and sign NDAs",
    desc: "Real-time messaging, video calls, and NDA requests, all inside one platform.",
  },
  {
    step: "04",
    role: "Both",
    title: "Close deals and track commissions",
    desc: "Move through the full pipeline with a complete audit trail and automatic invoicing.",
  },
];

const TESTIMONIALS = [
  {
    quote: "iVest connected me with a FinTech builder in Lagos within 48 hours. We closed a $250K deal in 6 weeks.",
    name: "Marcus T.",
    title: "Angel investor, London",
    avatar: IMG.avatars[0],
  },
  {
    quote: "As a builder in Nairobi, getting visibility to verified global investors was impossible. iVest changed that.",
    name: "Amara K.",
    title: "Founder, AgriTech startup",
    avatar: IMG.avatars[1],
  },
  {
    quote: "The deal pipeline keeps everything organized. I can track 12 active deals without losing my mind.",
    name: "David L.",
    title: "Venture partner, Singapore",
    avatar: IMG.avatars[2],
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#F5F3ED] overflow-x-hidden">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0F0F1A]/95 backdrop-blur-md border-b border-[#3A3A52]" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="iVest" className="w-9 h-9 rounded-lg" />
            <span className="text-lg font-medium tracking-tight flex items-center text-[#C9A84C]">
  IV
  <span className="flex flex-col justify-center gap-[3px] mx-[2px] h-[18px] text-[#C9A84C]">
    {/* Three stacked lines for the stylized E */}
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
  </span>
  ST
</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "For investors", "For builders"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-[#A8A6B8] hover:text-[#F5F3ED] transition"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/auth/login")}
              className="hidden sm:block text-sm text-[#A8A6B8] hover:text-[#F5F3ED] transition px-3 py-1.5"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — full-bleed photo with duotone overlay so the image reads
          as part of the brand rather than a stock photo dropped on top. */}
      <section className="relative min-h-screen flex flex-col items-center justify-end px-6 pb-20 text-center overflow-hidden">
        <img
          src={IMG.hero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,15,26,0.55) 0%, rgba(15,15,26,0.75) 55%, #0F0F1A 96%)",
          }}
        />
        <div
          className="absolute inset-0 mix-blend-color"
          style={{ backgroundColor: "#1A1A2E" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(201,168,76,0.18), transparent 60%)" }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-3xl">
          <div className="flex items-center gap-2 bg-[#0F0F1A]/60 backdrop-blur border border-[#C9A84C30] rounded-full px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
            <span className="text-[#C9A84C] text-xs font-medium">
              Verified investors active now across 67 countries
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">
            Invest in Innovation.{" "}
            <span className="text-[#C9A84C]">Build the Future.</span>
          </h1>

          <p className="text-[#D8D6E8] text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
            A global, verified investment ecosystem connecting investors and builders securely, across borders.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition"
              style={{ boxShadow: "0 8px 32px rgba(201, 168, 76, 0.3)" }}
            >
              Start investing
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center gap-2 border border-[#F5F3ED40] text-[#F5F3ED] font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-[#F5F3ED10] backdrop-blur transition"
            >
              Log in to dashboard
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-10">
          <ChevronDown size={16} className="text-[#A8A6B8]" />
        </div>
      </section>

      {/* Stats — floating glass strip that overlaps the hero/next section seam */}
      <section className="relative z-20 -mt-10 px-6">
        <div className="max-w-5xl mx-auto bg-[#1A1A2E]/90 backdrop-blur-md border border-[#3A3A52] rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-8 px-8 py-8 shadow-2xl">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-medium text-[#C9A84C] mb-1">{s.value}</div>
              <div className="text-sm text-[#5C5A70]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — photographic bento grid. Each tile is a real photo with
          a bottom-anchored caption, not an icon-in-a-box card. */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
            Platform features
          </div>
          <h2 className="text-3xl font-medium mb-4">
            Everything you need to close deals
          </h2>
          <p className="text-[#A8A6B8] text-sm max-w-md mx-auto">
            Built for serious investors and ambitious builders. No noise, no spam just verified connections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[190px] gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative rounded-2xl overflow-hidden border border-[#3A3A52] ${f.span}`}
              >
                <img
                  src={f.img}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(15,15,26,0.15) 0%, rgba(15,15,26,0.55) 60%, rgba(15,15,26,0.92) 100%)",
                  }}
                />
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <div className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center mb-3">
                    <Icon size={16} className="text-[#1A1A2E]" />
                  </div>
                  <h3 className="text-[#F5F3ED] text-sm font-medium mb-1.5">{f.title}</h3>
                  <p className="text-[#D8D6E8] text-xs leading-relaxed opacity-90">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works — sticky photo on one side, numbered timeline on the other */}
      <section id="how-it-works" className="bg-[#1A1A2E] border-y border-[#3A3A52]">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-start">
          <div className="md:sticky md:top-24 rounded-2xl overflow-hidden border border-[#3A3A52] h-[420px]">
            <img src={IMG.flow} alt="" className="w-full h-full object-cover" />
          </div>

          <div>
            <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
              How it works
            </div>
            <h2 className="text-3xl font-medium mb-4">
              From profile to closed deal
            </h2>
            <p className="text-[#A8A6B8] text-sm max-w-md mb-12">
              A structured four-step process that takes you from verified profile to signed agreement.
            </p>

            <div className="flex flex-col">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="relative flex gap-5 pb-10 last:pb-0">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-px bg-[#3A3A52]" />
                  )}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#0F0F1A] border border-[#C9A84C] text-[#C9A84C] flex items-center justify-center text-xs font-bold shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mb-2 ${
                      step.role === "Investor"
                        ? "bg-blue-900/30 text-blue-400 border-blue-800"
                        : step.role === "Both"
                        ? "bg-[#C9A84C10] text-[#C9A84C] border-[#C9A84C30]"
                        : "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                    }`}>
                      {step.role}
                    </span>
                    <h3 className="text-[#F5F3ED] text-base font-medium mb-1.5">{step.title}</h3>
                    <p className="text-[#5C5A70] text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For investors / For builders — full-width photographic split bands */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-6">

        <div id="for-investors" className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#3A3A52]">
          <div className="relative h-64 md:h-auto">
            <img src={IMG.investors} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1A1A2E] via-transparent to-transparent" />
          </div>
          <div className="bg-[#1A1A2E] p-8 md:p-10 flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center mb-5">
              <TrendingUp size={18} className="text-blue-400" />
            </div>
            <div className="text-blue-400 text-xs font-medium uppercase tracking-widest mb-3">
              For investors
            </div>
            <h3 className="text-[#F5F3ED] text-xl font-medium mb-4">
              Find deals that match your thesis
            </h3>
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-6">
              Stop sifting through unverified pitch decks. iVest surfaces verified startups matched to your exact investment criteria.
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {[
                "AI-scored project recommendations",
                "Verified founder identities",
                "Deal pipeline from NDA to close",
                "Portfolio analytics dashboard",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                  <CheckCircle size={13} className="text-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/onboarding")}
              className="self-start flex items-center gap-2 border border-blue-700 text-blue-400 text-sm px-5 py-2.5 rounded-lg hover:bg-blue-900/20 transition"
            >
              Join as investor <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        <div id="for-builders" className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#3A3A52]">
          <div className="bg-[#1A1A2E] p-8 md:p-10 flex flex-col justify-center md:order-1 order-2">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C10] flex items-center justify-center mb-5">
              <Zap size={18} className="text-[#C9A84C]" />
            </div>
            <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
              For builders
            </div>
            <h3 className="text-[#F5F3ED] text-xl font-medium mb-4">
              Raise from investors who actually care
            </h3>
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-6">
              Upload your project, set your funding goal, and get discovered by verified global investors. No cold outreach needed.
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {[
                "Project listing with banner and logo",
                "Real-time investor interest tracking",
                "View analytics by country and region",
                "Funding progress bar and milestones",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                  <CheckCircle size={13} className="text-[#C9A84C] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/onboarding")}
              className="self-start flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition"
            >
              List your startup <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="relative h-64 md:h-auto md:order-2 order-1">
            <img src={IMG.builders} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-[#1A1A2E] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* Testimonials — real headshot photos instead of initials/no avatar */}
      <section className="bg-[#1A1A2E] border-y border-[#3A3A52]">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <Quote size={28} className="text-[#C9A84C] mx-auto mb-8 opacity-60" />

          <div className="relative min-h-[180px] flex items-center justify-center">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
                  i === activeTestimonial
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <p className="text-[#F5F3ED] text-lg leading-relaxed mb-6 italic max-w-xl">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#C9A84C40]"
                  />
                  <div className="text-left">
                    <div className="text-[#C9A84C] text-sm font-medium">{t.name}</div>
                    <div className="text-[#5C5A70] text-xs mt-0.5">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-10">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`rounded-full transition-all ${
                  i === activeTestimonial ? "w-6 h-2 bg-[#C9A84C]" : "w-2 h-2 bg-[#3A3A52]"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — photo banner instead of flat background */}
      <section className="relative px-6 py-32 text-center overflow-hidden">
        <img src={IMG.cta} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #0F0F1A 0%, rgba(15,15,26,0.75) 40%, #0F0F1A 100%)" }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl font-medium mb-4">
            Ready to connect with the world?
          </h2>
          <p className="text-[#D8D6E8] text-sm mb-10 max-w-md mx-auto">
            Join thousands of verified investors and builders already using iVest to close deals across borders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition"
              style={{ boxShadow: "0 8px 32px rgba(201, 168, 76, 0.25)" }}
            >
              Create free account
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center border border-[#F5F3ED40] text-[#F5F3ED] font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-[#F5F3ED10] backdrop-blur transition"
            >
              Log in
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#3A3A52] bg-[#0F0F1A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-icon.png" alt="iVest" className="w-6 h-6 rounded" />
                <span className="text-lg font-medium tracking-tight flex items-center text-[#C9A84C]">
  IV
  <span className="flex flex-col justify-center gap-[3px] mx-[2px] h-[18px] text-[#C9A84C]">
    {/* Three stacked lines for the stylized E */}
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
    <span className="w-[12px] h-[2px] bg-[#C9A84C]"></span>
  </span>
  ST
</span>
              </div>
              <p className="text-[#5C5A70] text-xs leading-relaxed">
                Invest in Innovation.<br />Build the Future.
              </p>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Platform</div>
              <div className="flex flex-col gap-2">
                {["Explore projects", "Find investors", "AI matches", "Community"].map((item) => (
                  <button
                    key={item}
                    onClick={() => router.push("/auth/login")}
                    className="text-[#5C5A70] text-xs hover:text-[#A8A6B8] transition text-left"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Company</div>
              <div className="flex flex-col gap-2">
                {["About iVest", "Blog", "Careers", "Press"].map((item) => (
                  <span key={item} className="text-[#5C5A70] text-xs">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Legal</div>
              <div className="flex flex-col gap-2">
                {["Privacy policy", "Terms of service", "Cookie policy", "Compliance"].map((item) => (
                  <span key={item} className="text-[#5C5A70] text-xs">{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#3A3A52] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#5C5A70] text-xs">
              © 2026 iVest. All rights reserved. Trusted · Verified · Borderless
            </p>
            <div className="flex items-center gap-4">
              {["Twitter", "LinkedIn", "Discord"].map((s) => (
                <span key={s} className="text-[#5C5A70] text-xs hover:text-[#A8A6B8] cursor-pointer transition">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}