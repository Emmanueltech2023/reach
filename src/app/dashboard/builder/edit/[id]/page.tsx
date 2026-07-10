"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { ArrowLeft, Loader2, Camera, Upload, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SECTORS = [
  "FinTech","HealthTech","EdTech","AgriTech","DeFi",
  "NFT","DAO","Infrastructure","E-commerce","SaaS","AI/ML","CleanTech","Other",
];

const STAGES = [
  { id: "idea", label: "Idea", desc: "Pre-product, concept stage" },
  { id: "mvp", label: "MVP", desc: "Product built, early users" },
  { id: "growth", label: "Growth", desc: "Revenue, scaling users" },
  { id: "scaling", label: "Scaling", desc: "Proven model, scaling fast" },
];

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
  } | null>(null);
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
    amountRaised: "",
    country: "",
    website: "",
    twitter: "",
    stage: "idea",
    logoUrl: "",
    bannerUrl: "",
  });

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .eq("founder_id", user.id)
      .single();

    if (data) {
      setForm({
        name: data.name || "",
        shortDescription: data.short_description || "",
        fullDescription: data.full_description || "",
        category: data.category || "web2",
        sector: data.sector || "",
        fundingGoal: data.funding_goal?.toString() || "",
        equityOffered: data.equity_offered?.toString() || "",
        amountRaised: data.amount_raised?.toString() || "",
        country: data.country || "",
        website: data.website || "",
        twitter: data.twitter || "",
        stage: data.stage || "idea",
        logoUrl: data.logo_url || "",
        bannerUrl: data.banner_url || "",
      });
      if (data.logo_url) setLogoPreview(data.logo_url);
      if (data.banner_url) setBannerPreview(data.banner_url);
    }
    setLoading(false);
  };

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
    const res = await fetch("/api/upload/image", { method: "POST", body: formData });
    const data = await res.json();
    return data.url as string;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      let logoUrl = form.logoUrl;
      let bannerUrl = form.bannerUrl;

      if (logoFile) logoUrl = await uploadImage(logoFile, `logos/${user.id}`);
      if (bannerFile) bannerUrl = await uploadImage(bannerFile, `banners/${user.id}`);

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          name: form.name,
          short_description: form.shortDescription,
          full_description: form.fullDescription,
          category: form.category,
          sector: form.sector,
          funding_goal: parseFloat(form.fundingGoal),
          equity_offered: parseFloat(form.equityOffered),
          amount_raised: parseFloat(form.amountRaised || "0"),
          country: form.country,
          website: form.website || null,
          twitter: form.twitter || null,
          stage: form.stage,
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
        })
        .eq("id", params.id)
        .eq("founder_id", user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/project/${params.id}`);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="builder" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}>
            <ArrowLeft size={20} className="text-[#A8A6B8]" />
          </button>
          <div className="flex-1">
            <h1 className="text-[#F5F3ED] text-base font-medium">Edit project</h1>
            <p className="text-[#5C5A70] text-xs">{form.name}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              saving
                ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
            }`}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Banner */}
        <div
          className="relative w-full h-40 bg-[#1A1A2E] rounded-xl cursor-pointer overflow-hidden mb-4"
          onClick={() => bannerRef.current?.click()}
        >
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Upload size={22} className="text-[#3A3A52]" />
              <span className="text-[#5C5A70] text-xs">Click to update banner</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
            <Camera size={20} className="text-white" />
          </div>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleImageSelect(e, "banner")} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-xl bg-[#1A1A2E] border-2 border-[#3A3A52] flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
            onClick={() => logoRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Camera size={20} className="text-[#3A3A52]" />
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImageSelect(e, "logo")} />
          </div>
          <div>
            <p className="text-[#F5F3ED] text-sm font-medium">Project media</p>
            <p className="text-[#5C5A70] text-xs">Click banner or logo to update</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-xs rounded-lg px-4 py-3 mb-4">
            Project updated! Redirecting…
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Project Name</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Short Description</label>
            <input name="shortDescription" value={form.shortDescription} onChange={handleChange}
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Full Description</label>
            <textarea name="fullDescription" value={form.fullDescription} onChange={handleChange}
              rows={4} className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Category</label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition">
                <option value="web2">Web2</option>
                <option value="web3">Web3</option>
              </select>
            </div>
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Sector</label>
              <select name="sector" value={form.sector} onChange={handleChange}
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition">
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Stage</label>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map((s) => (
                <button key={s.id} type="button"
                  onClick={() => setForm({ ...form, stage: s.id })}
                  className={`py-2.5 px-3 rounded-lg border text-left transition ${
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Funding Goal (USD)</label>
              <input name="fundingGoal" type="number" value={form.fundingGoal} onChange={handleChange}
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
            </div>
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Equity Offered (%)</label>
              <input name="equityOffered" type="number" value={form.equityOffered} onChange={handleChange}
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
            </div>
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Amount Raised (USD)</label>
            <input name="amountRaised" type="number" value={form.amountRaised} onChange={handleChange}
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
            <p className="text-[#5C5A70] text-xs mt-1">Update this as you raise more funding</p>
          </div>

          <div>
            <label className="text-[#A8A6B8] text-xs mb-1.5 block">Country</label>
            <input name="country" value={form.country} onChange={handleChange}
              className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Website</label>
              <input name="website" value={form.website} onChange={handleChange}
                placeholder="https://"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
            </div>
            <div>
              <label className="text-[#A8A6B8] text-xs mb-1.5 block">Twitter / X</label>
              <input name="twitter" value={form.twitter} onChange={handleChange}
                placeholder="@handle"
                className="w-full bg-[#1A1A2E] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-3 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full font-medium text-sm py-3 rounded-lg transition ${
              saving
                ? "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                : "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Saving…
              </span>
            ) : "Save changes"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}