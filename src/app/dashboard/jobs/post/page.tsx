'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  ArrowLeft, Briefcase, Building2, MapPin, DollarSign, 
  Globe, Layers, Star, Image as ImageIcon,
  CheckCircle2, AlertCircle, Link as LinkIcon, Upload, X, Loader2, Sparkles, Plus
} from 'lucide-react';
import Link from 'next/link';
import KycModal from '@/components/KycModal';

const SECTORS = [
  "FinTech", "HealthTech", "EdTech", "AgriTech", "DeFi", "NFT", 
  "DAO", "Infrastructure", "E-commerce", "SaaS", "AI/ML", "CleanTech", "Other"
];

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
  username: string;
  kyc_status?: string;
}

export default function PostJobPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>(['React', 'TypeScript']);
  const [useManualLogoUrl, setUseManualLogoUrl] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_name: '',
    company_logo_url: '',
    category: 'web3',
    sector: SECTORS[0],
    job_type: 'full_time',
    location_type: 'remote',
    location: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    experience_level: 'mid',
    external_apply_url: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, role, full_name, username, kyc_status')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (!['investor', 'builder', 'admin'].includes(profileData.role)) {
          router.push('/dashboard');
          return;
        }
        
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [supabase, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Direct Computer File Upload to Cloudinary
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('bucket', 'jobs');

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: uploadData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload logo');

      setFormData(prev => ({ ...prev, company_logo_url: data.url }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setError(err.message || 'Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, company_logo_url: '' }));
  };

  // Skill Tags Management
  const addSkill = (skill: string) => {
    const trimmed = skill.trim().replace(/^,+|,+$/g, '');
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
    }
    setSkillInput('');
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Progressive Flow: Check KYC Verification status before posting job
    if (profile.kyc_status !== "approved") {
      setShowKycModal(true);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        company_name: formData.company_name,
        company_logo_url: formData.company_logo_url || null,
        category: formData.category,
        sector: formData.sector,
        job_type: formData.job_type,
        location_type: formData.location_type,
        location: formData.location_type === 'remote' ? null : formData.location,
        salary_min: formData.salary_min ? Number(formData.salary_min) : null,
        salary_max: formData.salary_max ? Number(formData.salary_max) : null,
        salary_currency: formData.salary_currency,
        experience_level: formData.experience_level,
        skills: skillsList,
        external_apply_url: formData.external_apply_url || null,
        posted_by: profile.id,
        is_published: true
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to post job listing');
      }
      
      router.push('/dashboard/jobs/manage');
    } catch (err: any) {
      console.error('Error posting job:', err);
      setError(err.message || 'An unexpected error occurred while posting job');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0F]">
        <Loader2 className="h-10 w-10 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <DashboardShell role={profile?.role} fullName={profile?.full_name} username={profile?.username}>
      <div className="mx-auto max-w-6xl space-y-8 px-3 sm:px-6 py-6 animate-in fade-in duration-300">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link 
              href="/dashboard/jobs/manage"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A2E] text-[#A8A6B8] border border-[#3A3A52] transition-colors hover:border-[#C9A84C] hover:text-[#F5F3ED]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[#F5F3ED] flex items-center gap-2">
                <span>Post a New Job</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 font-semibold">
                  Reach Talent
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A8A6B8] mt-0.5">Recruit verified developers, founders, designers, and operators</p>
            </div>
          </div>

          <Link 
            href="/dashboard/jobs/manage"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C] px-4 py-2.5 text-xs font-bold text-[#F5F3ED] transition-colors shadow-sm"
          >
            <Briefcase className="h-4 w-4 text-[#C9A84C]" />
            <span>View My Posted Jobs</span>
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form (8 Columns) */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
            
            {/* Basic Info */}
            <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-[#F5F3ED] pb-2 border-b border-[#3A3A52]/60">
                <Briefcase className="h-5 w-5 text-[#C9A84C]" />
                <h2 className="text-base sm:text-lg font-bold">Role Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                    Job Title <span className="text-[#C9A84C]">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Smart Contract Engineer"
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                    Role Description & Requirements <span className="text-[#C9A84C]">*</span>
                  </label>
                  <textarea
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Provide overview, key responsibilities, qualifications, and benefits..."
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3.5 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Company Details & Logo Upload */}
            <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-[#F5F3ED] pb-2 border-b border-[#3A3A52]/60">
                <Building2 className="h-5 w-5 text-[#C9A84C]" />
                <h2 className="text-base sm:text-lg font-bold">Company & Branding</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                    Company / Project Name <span className="text-[#C9A84C]">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Nexus Protocol"
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none transition-colors"
                  />
                </div>

                {/* Company Logo Upload Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                      Company Logo
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseManualLogoUrl(!useManualLogoUrl)}
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      {useManualLogoUrl ? "Upload image file instead" : "Paste URL instead"}
                    </button>
                  </div>

                  {useManualLogoUrl ? (
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <ImageIcon className="h-4 w-4 text-[#5C5A70]" />
                      </div>
                      <input
                        type="url"
                        name="company_logo_url"
                        value={formData.company_logo_url}
                        onChange={handleInputChange}
                        placeholder="https://yourcompany.com/logo.png"
                        className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none transition-colors"
                      />
                    </div>
                  ) : (
                    <div>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />

                      {formData.company_logo_url ? (
                        <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[#3A3A52] bg-[#0A0A0F]">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                              <img src={formData.company_logo_url} alt="Company logo preview" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#F5F3ED]">Logo Uploaded</p>
                              <p className="text-[11px] text-[#A8A6B8] truncate max-w-xs">{formData.company_logo_url}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Remove logo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-[#3A3A52] hover:border-[#C9A84C] rounded-xl p-5 text-center transition-colors bg-[#0A0A0F] cursor-pointer group"
                        >
                          {uploadingLogo ? (
                            <div className="flex flex-col items-center justify-center py-2 gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
                              <span className="text-xs text-[#A8A6B8]">Uploading logo to Cloudinary…</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-1 gap-2">
                              <div className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center text-[#A8A6B8] group-hover:text-[#C9A84C] transition-colors">
                                <Upload className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                                  Click to upload logo from your computer
                                </p>
                                <p className="text-[11px] text-[#5C5A70] mt-0.5">PNG, JPG, SVG, WebP up to 5MB</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categorization & Job Type */}
            <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-[#F5F3ED] pb-2 border-b border-[#3A3A52]/60">
                <Layers className="h-5 w-5 text-[#C9A84C]" />
                <h2 className="text-base sm:text-lg font-bold">Category & Work Model</h2>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Ecosystem</label>
                  <div className="flex rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-1">
                    {['web3', 'web2'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                        className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-bold uppercase transition-all ${
                          formData.category === cat 
                            ? 'bg-[#C9A84C] text-[#0A0A0F] shadow-sm' 
                            : 'text-[#A8A6B8] hover:text-[#F5F3ED]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Sector / Industry</label>
                  <select
                    name="sector"
                    value={formData.sector}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-2.5 sm:p-3 text-sm text-[#F5F3ED] focus:border-[#C9A84C] focus:outline-none"
                  >
                    {SECTORS.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Employment Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'full_time', label: 'Full-time' },
                    { id: 'part_time', label: 'Part-time' },
                    { id: 'contract', label: 'Contract' },
                    { id: 'internship', label: 'Internship' },
                    { id: 'freelance', label: 'Freelance' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, job_type: type.id }))}
                      className={`rounded-xl border py-2.5 px-3 text-center text-xs font-semibold transition-all ${
                        formData.job_type === type.id
                          ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-[#3A3A52] bg-[#0A0A0F] text-[#A8A6B8] hover:border-[#5C5A70]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Experience Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'entry', label: 'Entry Level' },
                    { id: 'mid', label: 'Mid Level' },
                    { id: 'senior', label: 'Senior Level' },
                    { id: 'lead', label: 'Lead / Principal' }
                  ].map(level => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, experience_level: level.id }))}
                      className={`rounded-xl border py-2.5 px-3 text-center text-xs font-semibold transition-all ${
                        formData.experience_level === level.id
                          ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-[#3A3A52] bg-[#0A0A0F] text-[#A8A6B8] hover:border-[#5C5A70]'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location & Compensation */}
            <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-[#F5F3ED] pb-2 border-b border-[#3A3A52]/60">
                <MapPin className="h-5 w-5 text-[#C9A84C]" />
                <h2 className="text-base sm:text-lg font-bold">Location & Compensation</h2>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Location Mode</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'remote', label: 'Remote', icon: Globe },
                    { id: 'hybrid', label: 'Hybrid', icon: Building2 },
                    { id: 'onsite', label: 'On-site', icon: MapPin }
                  ].map(loc => {
                    const Icon = loc.icon;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, location_type: loc.id }))}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all ${
                          formData.location_type === loc.id
                            ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                            : 'border-[#3A3A52] bg-[#0A0A0F] text-[#A8A6B8] hover:border-[#5C5A70]'
                        }`}
                      >
                        <Icon className="mb-1.5 h-5 w-5" />
                        <span className="text-xs font-semibold">{loc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.location_type !== 'remote' && (
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">City, Country <span className="text-[#C9A84C]">*</span></label>
                  <input
                    required
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. London, UK or New York, USA"
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Salary Min</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <DollarSign className="h-4 w-4 text-[#5C5A70]" />
                    </div>
                    <input
                      type="number"
                      name="salary_min"
                      value={formData.salary_min}
                      onChange={handleInputChange}
                      placeholder="60000"
                      className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-2.5 sm:p-3 pl-9 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Salary Max</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <DollarSign className="h-4 w-4 text-[#5C5A70]" />
                    </div>
                    <input
                      type="number"
                      name="salary_max"
                      value={formData.salary_max}
                      onChange={handleInputChange}
                      placeholder="120000"
                      className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-2.5 sm:p-3 pl-9 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">Currency</label>
                  <select
                    name="salary_currency"
                    value={formData.salary_currency}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-2.5 sm:p-3 text-sm text-[#F5F3ED] focus:border-[#C9A84C] focus:outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH (Ξ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Skills & External Apply */}
            <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-5 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center gap-2 text-[#F5F3ED] pb-2 border-b border-[#3A3A52]/60">
                <Star className="h-5 w-5 text-[#C9A84C]" />
                <h2 className="text-base sm:text-lg font-bold">Skills & Application Method</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                    Required Skills (Type and press Enter)
                  </label>
                  
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      placeholder="e.g. Solidity, Next.js, Rust, Figma"
                      className="flex-1 rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-2.5 sm:p-3 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(skillInput)}
                      className="px-4 py-2 bg-[#2A2A3E] hover:bg-[#3A3A52] text-[#F5F3ED] text-xs font-semibold rounded-xl transition border border-[#3A3A52] flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4 text-[#C9A84C]" />
                      <span>Add</span>
                    </button>
                  </div>

                  {skillsList.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skillsList.map(skill => (
                        <span 
                          key={skill}
                          className="inline-flex items-center gap-1.5 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 text-xs px-3 py-1 rounded-full font-medium"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="text-[#C9A84C] hover:text-red-400 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#F5F3ED]">
                    External Application URL (Optional)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <LinkIcon className="h-4 w-4 text-[#5C5A70]" />
                    </div>
                    <input
                      type="url"
                      name="external_apply_url"
                      value={formData.external_apply_url}
                      onChange={handleInputChange}
                      placeholder="https://jobs.lever.co/..."
                      className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-sm text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#5C5A70]">Leave empty to allow direct applications via REACH talent dashboard.</p>
                </div>
              </div>
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link 
                href="/dashboard/jobs/manage"
                className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-medium text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || uploadingLogo}
                className="flex items-center gap-2 rounded-full bg-[#C9A84C] hover:bg-[#D4B55D] px-7 py-3 text-xs sm:text-sm font-bold text-[#0A0A0F] shadow-lg shadow-[#C9A84C]/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#0A0A0F]" />
                    <span>Publishing Listing…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Publish Job Listing</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SIDEBAR: Live Card Preview (4 Columns) */}
          <aside className="lg:col-span-4 sticky top-[76px] space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A8A6B8] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" />
                Live Candidate Preview
              </span>
              <span className="text-[10px] bg-[#2A2A3E] text-[#A8A6B8] px-2 py-0.5 rounded-full border border-[#3A3A52]">
                Interactive
              </span>
            </div>

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-[#0F0F1A] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {formData.company_logo_url ? (
                    <img src={formData.company_logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-[#C9A84C]">
                      {formData.company_name ? formData.company_name.slice(0, 2).toUpperCase() : 'JB'}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${
                      formData.category === 'web3' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      {formData.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2A3E] text-[#A8A6B8] border border-[#3A3A52] capitalize">
                      {formData.job_type.replace('_', '-')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F5F3ED] mt-1 truncate">
                    {formData.title || 'Senior Smart Contract Engineer'}
                  </h3>
                  <p className="text-xs text-[#A8A6B8] truncate">
                    {formData.company_name || 'Your Company Name'}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#3A3A52]/60 pt-3 space-y-2 text-xs text-[#A8A6B8]">
                <div className="flex items-center justify-between">
                  <span className="text-[#5C5A70]">Location:</span>
                  <span className="font-medium text-[#F5F3ED] capitalize">
                    {formData.location_type === 'remote' ? 'Remote 🌐' : (formData.location || 'Hybrid / Onsite')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C5A70]">Compensation:</span>
                  <span className="font-bold text-[#C9A84C]">
                    {formData.salary_min || formData.salary_max 
                      ? `${formData.salary_currency} ${formData.salary_min ? Number(formData.salary_min).toLocaleString() : '0'} - ${formData.salary_max ? Number(formData.salary_max).toLocaleString() : 'Negotiable'}`
                      : 'Competitive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C5A70]">Experience:</span>
                  <span className="capitalize text-[#F5F3ED] font-medium">{formData.experience_level} Level</span>
                </div>
              </div>

              {skillsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {skillsList.slice(0, 4).map(skill => (
                    <span key={skill} className="text-[10px] px-2 py-0.5 bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] rounded-md">
                      {skill}
                    </span>
                  ))}
                  {skillsList.length > 4 && (
                    <span className="text-[10px] px-1 text-[#5C5A70]">+{skillsList.length - 4}</span>
                  )}
                </div>
              )}

              <div className="pt-2">
                <div className="w-full py-2 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C]/30 text-center text-xs font-bold text-[#C9A84C]">
                  Apply Now
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A2E]/50 border border-[#3A3A52] rounded-2xl p-4 text-xs text-[#5C5A70] space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#A8A6B8]">
                <CheckCircle2 className="h-4 w-4 text-[#C9A84C]" />
                <span>Verified Direct Placement</span>
              </div>
              <p className="leading-relaxed">
                Your listing reaches verified Web2 & Web3 builders, investors, and job seekers directly across REACH.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Progressive Flow: Action-Gated KYC Verification Modal */}
      {profile && (
        <KycModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          userId={profile.id}
          userRole={profile.role}
          actionContext="Identity verification required to post job listings to the talent directory"
          onSuccess={() => {
            setProfile({ ...profile, kyc_status: "pending" });
          }}
        />
      )}
    </DashboardShell>
  );
}
