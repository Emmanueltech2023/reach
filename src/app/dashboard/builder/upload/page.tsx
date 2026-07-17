"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Star, Camera, Upload, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SECTORS = [
  "FinTech","HealthTech","EdTech","AgriTech","DeFi",
  "NFT","DAO","Infrastructure","E-commerce","SaaS",
  "AI/ML","CleanTech","Other",
];

const STAGES = [
  { id: "idea", label: "Idea", desc: "Pre-product, concept stage" },
  { id: "mvp", label: "MVP", desc: "Product built, early users" },
  { id: "growth", label: "Growth", desc: "Revenue, scaling users" },
  { id: "scaling", label: "Scaling", desc: "Proven model, scaling fast" },
];

export default function UploadProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedTierInfo, setSelectedTierInfo] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    fullDescription: "",
    category: "web2",
    sector: "",
    fundingGoal: "",
    equityOffered: "",
    amountAlreadyRaised: "",
    country: "",
    website: "",
    twitter: "",
    stage: "idea",
    tier: "free",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "logo") { setLogoFile(file); setLogoPreview(url); }
    else { setBannerFile(file); setBannerPreview(url); }
  };

  const uploadImage = async (file: File, path: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "project-assets");
    formData.append("path", path);
    const res = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Upload images first
      let logoUrl = "";
      let bannerUrl = "";
      if (logoFile) logoUrl = await uploadImage(logoFile, `logos/${user.id}`);
      if (bannerFile) bannerUrl = await uploadImage(bannerFile, `banners/${user.id}`);

      // Create the project
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderId: user.id,
          name: form.name,
          shortDescription: form.shortDescription,
          fullDescription: form.fullDescription,
          category: form.category,
          sector: form.sector,
          fundingGoal: parseFloat(form.fundingGoal),
          equityOffered: parseFloat(form.equityOffered),
          amountAlreadyRaised: parseFloat(form.amountAlreadyRaised || "0"),
          country: form.country,
          website: form.website,
          twitter: form.twitter,
          stage: form.stage,
          tier: form.tier,
          logoUrl,
          bannerUrl,
        }),
      });

      // Parse response FIRST before using data
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      // NOW upload pitch deck using the project ID from response
      if (data.project && pitchDeckFile) {
        const deckFormData = new FormData();
        deckFormData.append("file", pitchDeckFile);
        deckFormData.append("projectId", data.project.id);
        deckFormData.append("type", "pitch_deck");
        await fetch("/api/projects/upload-deck", {
          method: "POST",
          body: deckFormData,
        });
      }

      router.push("/dashboard/builder");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F1A] pb-12">
      <div className="max-w-lg mx-auto">

        {/* Fixed top header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3A3A52] sticky top-0 bg-[#0F0F1A] z-10">
          <button onClick={() => router.push("/dashboard/builder")}>
            <ArrowLeft size={20} className="text-[#A8A6B8]" />
          </button>
          <div>
            <h1 className="text-[#F5F3ED] text-base font-medium">Upload project</h1>
            <p className="text-[#5C5A70] text-xs">Connect with global investors</p>
          </div>
        </div>

        {/* Banner upload */}
        <div
          className="relative w-full h-40 bg-[#1A1A2E] cursor-pointer overflow-hidden"
          onClick={() => bannerRef.current?.click()}
        >
          {bannerPreview ? (
            <Image
              src={bannerPreview}
              alt="Banner"
              fill
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Upload size={22} className="text-[#3A3A52]" />
              <span className="text-[#5C5A70] text-xs">Click to upload banner image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
            <Camera size={20} className="text-white" />
          </div>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleImageSelect(e, "banner")} />
        </div>

        {/* Logo upload */}
        <div className="px-4 -mt-8 mb-6 flex items-end gap-4">
          <div
            className="w-16 h-16 rounded-xl bg-[#1A1A2E] border-2 border-[#0F0F1A] flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
            onClick={() => logoRef.current?.click()}
          >
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo"
                fill
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera size={20} className="text-[#3A3A52]" />
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImageSelect(e, "logo")} />
          </div>
          <div className="pt-2">
            <p className="text-[#F5F3ED] text-sm font-medium">Project media</p>
            <p className="text-[#5C5A70] text-xs">Banner (above) · Logo (left)</p>
          </div>
        </div>

        <div className="px-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Project Name *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                placeholder="e.g. ChainVault Protocol"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Short Description * (shown on card)</label>
              <input name="shortDescription" required value={form.shortDescription} onChange={handleChange}
                placeholder="One line summary"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Full Description *</label>
              <textarea name="fullDescription" required value={form.fullDescription} onChange={handleChange}
                rows={4} placeholder="Problem, solution, traction, team…"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70] resize-none" />
            </div>

            {/* Pitch deck upload — shown after name is entered */}
            {form.name && (
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                  Pitch Deck (PDF)
                </label>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer transition ${
                  pitchDeckFile
                    ? "border-[#C9A84C] bg-[#C9A84C08]"
                    : "border-[#3A3A52] hover:border-[#C9A84C]"
                }`}>
                  <FileText size={22} className={pitchDeckFile ? "text-[#C9A84C]" : "text-[#3A3A52]"} />
                  <div className="text-center">
                    <div className={`text-sm font-medium ${pitchDeckFile ? "text-[#C9A84C]" : "text-[#A8A6B8]"}`}>
                      {pitchDeckFile ? pitchDeckFile.name : "Upload pitch deck"}
                    </div>
                    <div className="text-xs text-[#5C5A70] mt-0.5">
                      {pitchDeckFile ? "Click to replace" : "PDF, DOC up to 20MB"}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setPitchDeckFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Category *</label>
                <select name="category" value={form.category} onChange={handleChange}
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition">
                  <option value="web2">Web2</option>
                  <option value="web3">Web3</option>
                </select>
              </div>
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Sector *</label>
                <select name="sector" required value={form.sector} onChange={handleChange}
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition">
                  <option value="">Select sector</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Project Stage *</label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setForm({ ...form, stage: s.id })}
                    className={`py-3 px-3 rounded-lg border text-left transition ${
                      form.stage === s.id
                        ? "border-[#C9A84C] bg-[#C9A84C10]"
                        : "border-[#3A3A52] hover:border-[#5C5A70]"
                    }`}>
                    <div className={`text-xs font-medium ${form.stage === s.id ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                      {s.label}
                    </div>
                    <div className="text-[#5C5A70] text-xs mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Funding */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Funding Goal (USD) *</label>
                <input name="fundingGoal" type="number" required min="1000"
                  value={form.fundingGoal} onChange={handleChange} placeholder="e.g. 500000"
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
              </div>
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Equity Offered (%) *</label>
                <input name="equityOffered" type="number" required min="0.1" max="100" step="0.1"
                  value={form.equityOffered} onChange={handleChange} placeholder="e.g. 15"
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
              </div>
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Amount Already Raised (USD)</label>
              <input name="amountAlreadyRaised" type="number" min="0"
                value={form.amountAlreadyRaised} onChange={handleChange}
                placeholder="e.g. 50000 (leave blank if none)"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
              <p className="text-[#5C5A70] text-xs mt-1">
                This sets your starting progress bar. You can update it anytime.
              </p>
            </div>

            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Country *</label>
              <input name="country" required value={form.country} onChange={handleChange}
                placeholder="e.g. Nigeria"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Website</label>
                <input name="website" type="url" value={form.website} onChange={handleChange}
                  placeholder="https://yourproject.com"
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
              </div>
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">Twitter / X</label>
                <input name="twitter" value={form.twitter} onChange={handleChange}
                  placeholder="@handle"
                  className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
              </div>
            </div>

            {/* Tier */}
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Listing Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "free", label: "Free", description: "Standard placement", price: "$0" },
                  { id: "pro", label: "Pro", description: "Badge + more visibility", price: "$29/mo" },
                  { id: "premium", label: "Premium", description: "Pinned at top of feed", price: "$79/mo" },
                ].map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => {
                      if (t.id === "free") {
                        setForm({ ...form, tier: "free" });
                        setShowUpgradePrompt(false);
                      } else {
                        setSelectedTierInfo(t.id);
                        setShowUpgradePrompt(true);
                      }
                    }}
                    className={`py-3 px-2 rounded-lg border text-left transition ${
                      form.tier === t.id
                        ? "border-[#C9A84C] bg-[#C9A84C10]"
                        : "border-[#3A3A52] hover:border-[#5C5A70]"
                    }`}>
                    <div className={`text-xs font-medium mb-0.5 ${form.tier === t.id ? "text-[#C9A84C]" : "text-[#F5F3ED]"}`}>
                      {t.label}
                    </div>
                    <div className="text-[#5C5A70] text-xs">{t.description}</div>
                    <div className={`text-xs font-medium mt-1 ${t.id === "free" ? "text-[#5C5A70]" : "text-[#C9A84C]"}`}>
                      {t.price}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className={`w-full font-medium text-sm py-3 rounded-lg transition mt-2 ${
                loading
                  ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                  : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Publishing…
                </span>
              ) : "Publish Project"}
            </button>
          </form>
        </div>
      </div>

      {/* Upgrade prompt */}
      {showUpgradePrompt && selectedTierInfo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-[#C9A84C20] flex items-center justify-center mx-auto mb-3">
                <Star size={22} className="text-[#C9A84C]" />
              </div>
              <h3 className="text-[#F5F3ED] text-base font-medium mb-1">
                Upgrade to {selectedTierInfo.charAt(0).toUpperCase() + selectedTierInfo.slice(1)}
              </h3>
              <p className="text-[#A8A6B8] text-xs leading-relaxed">
                {selectedTierInfo === "pro"
                  ? "Get a Pro badge, increased visibility and priority in search results."
                  : "Pin your project at the very top of the investor feed with a gold star."}
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/upgrade")}
              className="w-full bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm py-3 rounded-lg hover:opacity-90 transition mb-2"
            >
              Upgrade — {selectedTierInfo === "pro" ? "$29/mo" : "$79/mo"}
            </button>
            <button
              onClick={() => { setShowUpgradePrompt(false); setForm({ ...form, tier: "free" }); }}
              className="w-full border border-[#3A3A52] text-[#A8A6B8] text-sm py-3 rounded-lg hover:bg-[#0F0F1A] transition"
            >
              Continue with Free
            </button>
          </div>
        </div>
      )}
    </main>
  );
}