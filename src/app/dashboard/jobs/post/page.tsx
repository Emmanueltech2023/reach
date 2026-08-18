'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  ArrowLeft, Briefcase, Building2, MapPin, DollarSign, 
  Globe, Clock, Layers, Star, Image as ImageIcon,
  CheckCircle2, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';

const SECTORS = ["FinTech", "HealthTech", "EdTech", "AgriTech", "DeFi", "NFT", "DAO", "Infrastructure", "E-commerce", "SaaS", "AI/ML", "CleanTech", "Other"];

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
  username: string;
}

export default function PostJobPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    skills: '',
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
          .select('id, role, full_name, username')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (!['investor', 'builder', 'admin'].includes(profileData.role)) {
          router.push('/dashboard'); // unauthorized
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Process skills into array
      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
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
        skills: skillsArray,
        external_apply_url: formData.external_apply_url || null,
        posted_by: profile.id,
        is_published: true
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post job');
      }
      
      router.push('/dashboard/jobs/manage');
    } catch (err: any) {
      console.error('Error posting job:', err);
      setError(err.message || 'An unexpected error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0F]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3A3A52] border-t-[#C9A84C]" />
      </div>
    );
  }

  return (
    <DashboardShell role={profile?.role} fullName={profile?.full_name} username={profile?.username}>
      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/jobs/manage"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A2E] text-[#A8A6B8] transition-colors hover:bg-[#2A2A42] hover:text-[#F5F3ED]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F5F3ED]">Post a New Job</h1>
            <p className="text-[#A8A6B8]">Find the perfect candidate for your project or company</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl">
            <div className="mb-6 flex items-center space-x-2 text-[#F5F3ED]">
              <Briefcase className="h-5 w-5 text-[#C9A84C]" />
              <h2 className="text-xl font-semibold">Basic Information</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Job Title *</label>
                <input
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Smart Contract Developer"
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Description *</label>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Describe the role, responsibilities, and requirements..."
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl">
            <div className="mb-6 flex items-center space-x-2 text-[#F5F3ED]">
              <Building2 className="h-5 w-5 text-[#C9A84C]" />
              <h2 className="text-xl font-semibold">Company Details</h2>
            </div>
            
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Company Name *</label>
                <input
                  required
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Your Company"
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Company Logo URL</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <ImageIcon className="h-5 w-5 text-[#5C5A70]" />
                  </div>
                  <input
                    type="url"
                    name="company_logo_url"
                    value={formData.company_logo_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Role Details */}
          <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl">
            <div className="mb-6 flex items-center space-x-2 text-[#F5F3ED]">
              <Layers className="h-5 w-5 text-[#C9A84C]" />
              <h2 className="text-xl font-semibold">Role Categorization</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Category</label>
                <div className="flex rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-1">
                  {['web3', 'web2'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all ${
                        formData.category === cat 
                          ? 'bg-[#2A2A42] text-[#F5F3ED] shadow-sm' 
                          : 'text-[#5C5A70] hover:text-[#A8A6B8]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Sector</label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  {SECTORS.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-[#A8A6B8]">Job Type</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  { id: 'full_time', label: 'Full Time' },
                  { id: 'part_time', label: 'Part Time' },
                  { id: 'contract', label: 'Contract' },
                  { id: 'internship', label: 'Internship' },
                  { id: 'freelance', label: 'Freelance' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, job_type: type.id }))}
                    className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${
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

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#A8A6B8]">Experience Level</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { id: 'entry', label: 'Entry Level' },
                  { id: 'mid', label: 'Mid Level' },
                  { id: 'senior', label: 'Senior Level' },
                  { id: 'lead', label: 'Lead / Manager' }
                ].map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, experience_level: level.id }))}
                    className={`rounded-xl border p-3 text-center text-sm font-medium transition-all ${
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
          <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl">
            <div className="mb-6 flex items-center space-x-2 text-[#F5F3ED]">
              <MapPin className="h-5 w-5 text-[#C9A84C]" />
              <h2 className="text-xl font-semibold">Location & Compensation</h2>
            </div>
            
            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-[#A8A6B8]">Location Type</label>
              <div className="grid grid-cols-3 gap-3">
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
                      className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${
                        formData.location_type === loc.id
                          ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-[#3A3A52] bg-[#0A0A0F] text-[#A8A6B8] hover:border-[#5C5A70]'
                      }`}
                    >
                      <Icon className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">{loc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.location_type !== 'remote' && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">City, Country *</label>
                <input
                  required
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                />
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Salary Min (Optional)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-[#5C5A70]" />
                  </div>
                  <input
                    type="number"
                    name="salary_min"
                    value={formData.salary_min}
                    onChange={handleInputChange}
                    placeholder="80000"
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Salary Max (Optional)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-5 w-5 text-[#5C5A70]" />
                  </div>
                  <input
                    type="number"
                    name="salary_max"
                    value={formData.salary_max}
                    onChange={handleInputChange}
                    placeholder="120000"
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Currency</label>
                <select
                  name="salary_currency"
                  value={formData.salary_currency}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Extra Details */}
          <div className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl">
            <div className="mb-6 flex items-center space-x-2 text-[#F5F3ED]">
              <Star className="h-5 w-5 text-[#C9A84C]" />
              <h2 className="text-xl font-semibold">Additional Details</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">Required Skills (comma separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  placeholder="e.g. React, Solidity, Smart Contracts"
                  className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A8A6B8]">External Apply URL (Optional)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LinkIcon className="h-5 w-5 text-[#5C5A70]" />
                  </div>
                  <input
                    type="url"
                    name="external_apply_url"
                    value={formData.external_apply_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#3A3A52] bg-[#0A0A0F] p-3 pl-10 text-[#F5F3ED] placeholder-[#5C5A70] focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                  />
                  <p className="mt-2 text-xs text-[#5C5A70]">If provided, applicants will be redirected to this link to apply instead of applying via iVest.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link 
              href="/dashboard/jobs/manage"
              className="rounded-xl px-6 py-3 text-sm font-medium text-[#F5F3ED] transition-colors hover:bg-[#2A2A42]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 rounded-xl bg-[#C9A84C] px-8 py-3 text-sm font-bold text-[#0A0A0F] shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all hover:bg-[#D4B55D] hover:shadow-[0_0_25px_rgba(201,168,76,0.5)] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0A0F] border-t-transparent" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Post Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
