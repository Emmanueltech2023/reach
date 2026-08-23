'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  Search, MapPin, Briefcase, Clock, Bookmark, BookmarkCheck, 
  DollarSign, Star, Loader2, X, Upload, CheckCircle2, AlertCircle, 
  ExternalLink, Sparkles, ShieldCheck, ChevronRight, FileText, Zap, Lock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/components/CurrencyProvider';
import VerifiedBadge from '@/components/VerifiedBadge';

import KycModal from "@/components/KycModal";

export default function TalentDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showKycModal, setShowKycModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [jobType, setJobType] = useState('All');
  const [location, setLocation] = useState('All');
  const [experience, setExperience] = useState('All');

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [earlyAccessJob, setEarlyAccessJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const isProTalent = (profile?.subscription_tier || '').toLowerCase() === 'pro' || (profile?.subscription_tier || '').toLowerCase() === 'premium';

  function getEarlyAccessDetails(createdAt: string) {
    if (!createdAt) return { isEarlyAccess: false, hoursRemaining: 0 };
    const diffHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return { isEarlyAccess: true, hoursRemaining: Math.max(1, Math.ceil(24 - diffHours)) };
    }
    return { isEarlyAccess: false, hoursRemaining: 0 };
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, role, full_name, username, avatar_url, is_verified, subscription_tier')
            .eq('id', user.id)
            .single();
          setProfile(profileData);
          setUserId(user.id);
          
          const { data: bookmarks } = await supabase
            .from('job_bookmarks')
            .select('job_id')
            .eq('user_id', user.id);
          if (bookmarks) {
            setBookmarkedJobs(new Set(bookmarks.map(b => b.job_id)));
          }

          const { data: userApps } = await supabase
            .from('job_applications')
            .select('job_id')
            .eq('applicant_id', user.id);
          if (userApps) {
            setAppliedJobIds(new Set(userApps.map(a => a.job_id)));
          }
        }
        
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const toggleBookmark = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      router.push('/login');
      return;
    }
    try {
      const isBookmarked = bookmarkedJobs.has(jobId);
      const newBookmarks = new Set(bookmarkedJobs);
      if (isBookmarked) {
        newBookmarks.delete(jobId);
      } else {
        newBookmarks.add(jobId);
      }
      setBookmarkedJobs(newBookmarks);
      
      await fetch('/api/jobs/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, jobId })
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const openApplyModal = (job: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check 24h Early Access lock for free users
    const { isEarlyAccess } = getEarlyAccessDetails(job.created_at);
    if (isEarlyAccess && !isProTalent) {
      setEarlyAccessJob(job);
      return;
    }

    // If external apply URL exists, redirect directly
    if (job.external_apply_url) {
      window.open(job.external_apply_url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Progressive Flow: Check KYC Verification status before applying
    if (profile?.kyc_status !== "approved") {
      setShowKycModal(true);
      return;
    }

    setApplyingJob(job);
    setApplyError(null);
    setApplySuccess(false);
    setCoverLetter('');
    setResumeFile(null);
  };

  const submitApplication = async () => {
    if (!applyingJob || !userId) return;

    if (profile?.role && profile.role !== 'talent') {
      setApplyError('Only registered talent accounts can submit job applications.');
      return;
    }

    setIsSubmitting(true);
    setApplyError(null);

    try {
      let resumeUrl = '';
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('bucket', 'resumes');
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload resume file');
        }
        
        const { url } = await uploadRes.json();
        resumeUrl = url;
      }

      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: applyingJob.id,
          applicantId: userId,
          coverLetter,
          resumeUrl
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit application');
      }

      setAppliedJobIds(prev => new Set(prev).add(applyingJob.id));
      setApplySuccess(true);
      setTimeout(() => {
        setApplyingJob(null);
        setApplySuccess(false);
      }, 1500);
    } catch (error: any) {
      console.error('Error applying:', error);
      setApplyError(error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null, currency: string = 'USD') => {
    if (!min && !max) return 'Competitive Compensation';
    const curr = currency || 'USD';
    if (min && !max) return `${curr} ${min.toLocaleString()}+`;
    if (!min && max) return `Up to ${curr} ${max.toLocaleString()}`;
    return `${curr} ${min?.toLocaleString()} - ${max?.toLocaleString()}`;
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const daysDifference = Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysDifference === 0) return 'Today';
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    return rtf.format(daysDifference, 'day');
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title?.toLowerCase().includes(search.toLowerCase()) || 
      job.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      job.skills?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || job.category?.toLowerCase() === category.toLowerCase();
    const matchesType = jobType === 'All' || job.job_type?.toLowerCase() === jobType.toLowerCase().replace('-', '_');
    const matchesLocation = location === 'All' || job.location_type?.toLowerCase() === location.toLowerCase();
    const matchesExp = experience === 'All' || job.experience_level?.toLowerCase() === experience.toLowerCase();
    return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesExp;
  });

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1A1A2E] to-[#121224] border border-[#3A3A52] rounded-2xl p-5 sm:p-7 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 font-semibold uppercase tracking-wider">
                Talent Marketplace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F3ED]">
              Discover Web2 & Web3 Careers
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] max-w-xl">
              Apply directly to verified listings posted by high-growth startups and venture-backed founders.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/talent/applications"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-all"
            >
              <FileText className="h-4 w-4 text-[#C9A84C]" />
              <span>My Applications</span>
            </Link>
            <Link
              href="/dashboard/talent/saved"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-all"
            >
              <Bookmark className="h-4 w-4 text-[#C9A84C]" />
              <span>Saved Jobs ({bookmarkedJobs.size})</span>
            </Link>
          </div>
        </div>

        {/* Pro Talent Status / Upgrade Banner */}
        {isProTalent ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C9A84C20] via-[#1A1A2E] to-[#121224] border border-[#C9A84C]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(201,168,76,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/25 border border-[#C9A84C]/60 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#C9A84C]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F5F3ED]">Verified Pro Talent Member</span>
                  <VerifiedBadge tier={profile?.subscription_tier} isVerified={true} size={15} />
                </div>
                <p className="text-xs text-[#A8A6B8] mt-0.5">
                  Priority recruiter visibility active • 24h Early Access unlocked • Direct recruiter messaging enabled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-[#C9A84C] bg-[#C9A84C]/15 border border-[#C9A84C]/30 px-3 py-1 rounded-lg">
                PRO ACTIVE
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C9A84C10] to-[#1A1A2E] border border-[#C9A84C30] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C9A84C20] border border-[#C9A84C40] flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                  Get Hired Faster with REACH Talent Pro ($5/mo)
                </p>
                <p className="text-[11px] text-[#A8A6B8] mt-0.5">
                  Unlock 24h early job access, verified pro badge, recruiter priority ranking, and direct recruiter DM.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/upgrade"
              className="px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition-all shrink-0 shadow-md shadow-[#C9A84C]/20"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5A70]" />
            <input 
              type="text"
              placeholder="Search by role title, company name, or technology (e.g. Next.js, Solidity)..."
              className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-sm text-[#F5F3ED] placeholder-[#5C5A70] rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Category Toggle */}
            <div>
              <label className="text-[11px] font-bold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Ecosystem</label>
              <div className="flex bg-[#0A0A0F] p-1 rounded-xl border border-[#3A3A52]">
                {['All', 'Web3', 'Web2'].map(opt => (
                  <button 
                    key={opt}
                    onClick={() => setCategory(opt)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      category === opt 
                        ? 'bg-[#C9A84C] text-[#0A0A0F] shadow-sm' 
                        : 'text-[#A8A6B8] hover:text-[#F5F3ED]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div>
              <label className="text-[11px] font-bold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Job Type</label>
              <select 
                className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-xs font-medium text-[#F5F3ED] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
                value={jobType} 
                onChange={(e) => setJobType(e.target.value)}
              >
                {['All', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Location Mode */}
            <div>
              <label className="text-[11px] font-bold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Location</label>
              <select 
                className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-xs font-medium text-[#F5F3ED] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
              >
                {['All', 'Remote', 'Hybrid', 'Onsite'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="text-[11px] font-bold text-[#A8A6B8] uppercase tracking-wider mb-1 block">Experience</label>
              <select 
                className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-xs font-medium text-[#F5F3ED] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
                value={experience} 
                onChange={(e) => setExperience(e.target.value)}
              >
                {['All', 'Entry', 'Mid', 'Senior', 'Lead'].map(opt => (
                  <option key={opt} value={opt}>{opt} Level</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-[#A8A6B8]">
              Showing <span className="text-[#F5F3ED] font-bold">{filteredJobs.length}</span> positions
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0F] flex items-center justify-center mx-auto text-[#5C5A70]">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3ED]">No open positions found</h3>
              <p className="text-xs text-[#A8A6B8] max-w-sm mx-auto">
                No jobs match your current search filters. Try broadening your criteria or reset filters.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setJobType('All');
                  setLocation('All');
                  setExperience('All');
                }}
                className="px-4 py-2 rounded-xl bg-[#2A2A3E] text-xs font-semibold text-[#F5F3ED] hover:bg-[#3A3A52] transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredJobs.map((job) => (
                <Link 
                  key={job.id} 
                  href={`/dashboard/talent/job/${job.id}`} 
                  className="block group"
                >
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[#C9A84C]/60 hover:shadow-xl hover:shadow-[#C9A84C]/5 relative overflow-hidden">
                    {job.is_featured && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C9A84C]/15 to-transparent rounded-bl-3xl pointer-events-none" />
                    )}
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      
                      {/* Company Logo Display */}
                      <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#C9A84C]/40 transition-colors">
                        {job.company_logo_url ? (
                          <img 
                            src={job.company_logo_url} 
                            alt={job.company_name || 'Company'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback on image broken
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-base sm:text-lg font-extrabold text-[#C9A84C]">
                            {job.company_name ? job.company_name.slice(0, 2).toUpperCase() : 'JB'}
                          </span>
                        )}
                      </div>
                      
                      {/* Job Meta */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-[#F5F3ED] group-hover:text-[#C9A84C] transition-colors truncate">
                            {job.title}
                          </h3>
                          {job.is_featured && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-0.5 rounded-full border border-[#C9A84C]/30">
                              <Star className="h-2.5 w-2.5 fill-current" /> Featured
                            </span>
                          )}
                          {(() => {
                            const { isEarlyAccess, hoursRemaining } = getEarlyAccessDetails(job.created_at);
                            if (!isEarlyAccess) return null;
                            return isProTalent ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                <Zap className="h-2.5 w-2.5 fill-current text-amber-400" /> 24h Early Access
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#0A0A0F] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-inner">
                                <Lock className="h-2.5 w-2.5 text-amber-400" /> Early Access • {hoursRemaining}h left
                              </span>
                            );
                          })()}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                          <span className="font-semibold text-[#F5F3ED]">{job.company_name}</span>
                          {job.profiles?.is_verified && (
                            <span className="flex items-center gap-0.5 text-[11px] text-[#C9A84C]">
                              <ShieldCheck className="h-3.5 w-3.5" /> Verified
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-[#5C5A70] flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {getRelativeTime(job.created_at)}
                          </span>
                        </div>
                        
                        {/* Tags Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${
                            job.category === 'web3' 
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}>
                            {job.category || 'Web3'}
                          </span>
                          
                          <span className="flex items-center gap-1 text-[#A8A6B8] bg-[#0A0A0F] border border-[#3A3A52] px-2 py-0.5 rounded-md text-[11px] capitalize">
                            <MapPin className="h-3 w-3 text-[#5C5A70]" />
                            {job.location_type === 'remote' ? 'Remote' : (job.location || job.location_type)}
                          </span>
                          
                          <span className="flex items-center gap-1 text-[#A8A6B8] bg-[#0A0A0F] border border-[#3A3A52] px-2 py-0.5 rounded-md text-[11px] capitalize">
                            <Briefcase className="h-3 w-3 text-[#5C5A70]" />
                            {job.job_type?.replace('_', '-')}
                          </span>

                          <span className="font-semibold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2 py-0.5 rounded-md text-[11px]">
                            {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                          </span>
                        </div>
                        
                        {/* Skills Chips */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {job.skills.slice(0, 4).map((skill: string) => (
                              <span key={skill} className="text-[10px] bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] px-2 py-0.5 rounded-md">
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 4 && (
                              <span className="text-[10px] text-[#5C5A70] px-1 py-0.5">
                                +{job.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3A3A52]/60 shrink-0">
                        <button 
                          onClick={(e) => toggleBookmark(job.id, e)}
                          className="p-2.5 rounded-xl border border-[#3A3A52] hover:bg-[#0A0A0F] hover:border-[#C9A84C] text-[#A8A6B8] hover:text-[#C9A84C] transition-colors"
                          title={bookmarkedJobs.has(job.id) ? "Remove bookmark" : "Save job"}
                        >
                          {bookmarkedJobs.has(job.id) ? (
                            <BookmarkCheck className="h-4 w-4 text-[#C9A84C]" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </button>
                        
                        {appliedJobIds.has(job.id) ? (
                          <span 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/talent/job/${job.id}`); }}
                            className="flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold text-xs py-2.5 px-4 rounded-xl flex-1 sm:flex-initial cursor-pointer hover:bg-emerald-500/25 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Applied</span>
                          </span>
                        ) : (
                          <button 
                            onClick={(e) => openApplyModal(job, e)}
                            className="flex items-center justify-center gap-1.5 bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] font-bold text-xs py-2.5 px-5 rounded-xl shadow-md shadow-[#C9A84C]/20 transition-all flex-1 sm:flex-initial"
                          >
                            <span>{job.external_apply_url ? 'Apply Ext' : 'Quick Apply'}</span>
                            {job.external_apply_url ? <ExternalLink className="h-3 w-3" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 sm:p-7 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setApplyingJob(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                {applyingJob.company_logo_url ? (
                  <img src={applyingJob.company_logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-[#C9A84C]">
                    {applyingJob.company_name ? applyingJob.company_name.slice(0, 2).toUpperCase() : 'JB'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#F5F3ED] truncate">{applyingJob.title}</h2>
                <p className="text-xs text-[#A8A6B8]">{applyingJob.company_name}</p>
              </div>
            </div>

            {applySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-[#F5F3ED]">Application Submitted!</h3>
                <p className="text-xs text-[#A8A6B8] max-w-xs mx-auto">
                  Your profile and application have been delivered to the hiring manager.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applyError && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#F5F3ED] mb-1.5">
                    Cover Note / Message to Recruiter (Optional)
                  </label>
                  <textarea 
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly highlight your relevant experience and why you're a great fit..."
                    className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-sm text-[#F5F3ED] placeholder-[#5C5A70] rounded-xl p-3 focus:outline-none focus:border-[#C9A84C] resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[#F5F3ED] mb-1.5">
                    Resume / Portfolio File (Optional)
                  </label>
                  <div className="border-2 border-dashed border-[#3A3A52] rounded-xl p-4 text-center hover:border-[#C9A84C] transition-colors bg-[#0A0A0F] relative cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setResumeFile(e.target.files[0]);
                        }
                      }}
                    />
                    <Upload className="h-6 w-6 text-[#5C5A70] group-hover:text-[#C9A84C] mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs font-semibold text-[#F5F3ED] truncate">
                      {resumeFile ? resumeFile.name : 'Click to select PDF or resume document'}
                    </p>
                    <p className="text-[10px] text-[#5C5A70] mt-0.5">PDF, DOC, DOCX up to 5MB</p>
                  </div>
                </div>
                
                <button 
                  onClick={submitApplication}
                  disabled={isSubmitting}
                  className="w-full bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] font-bold text-xs sm:text-sm py-3 rounded-xl transition-all shadow-lg shadow-[#C9A84C]/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Application…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Confirm & Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 24h Early Access Modal for Free Users */}
      {earlyAccessJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#C9A84C]/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 text-center space-y-5">
            <button 
              onClick={() => setEarlyAccessJob(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              <Zap className="h-7 w-7 fill-current text-[#C9A84C]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold tracking-widest text-[#C9A84C] uppercase bg-[#C9A84C]/10 border border-[#C9A84C]/25 px-2.5 py-0.5 rounded-full">
                PRO TALENT EXCLUSIVE
              </span>
              <h3 className="text-xl font-bold text-[#F5F3ED]">24-Hour Early Access</h3>
              <p className="text-xs text-[#A8A6B8] max-w-xs mx-auto">
                <span className="text-[#F5F3ED] font-semibold">{earlyAccessJob.company_name}</span> is currently accepting priority applications from Pro Talent members first.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0A0F] border border-[#3A3A52] text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#5C5A70]">Public Applications Open In</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {getEarlyAccessDetails(earlyAccessJob.created_at).hoursRemaining} Hours
                </span>
              </div>
              <div className="w-full bg-[#1A1A2E] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#C9A84C] to-amber-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.max(10, 100 - (getEarlyAccessDetails(earlyAccessJob.created_at).hoursRemaining / 24 * 100))}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <Link
                href="/dashboard/upgrade"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#A8882E] text-[#0A0A0F] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C9A84C]/25 hover:opacity-95 transition-all"
              >
                <Sparkles className="h-4 w-4 fill-current" />
                <span>Upgrade to Pro ($5/mo) to Apply Now</span>
              </Link>

              <button
                onClick={(e) => {
                  toggleBookmark(earlyAccessJob.id, e);
                  setEarlyAccessJob(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-[#F5F3ED] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#C9A84C]" />
                <span>Save Job to Apply When Public</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Flow: Action-Gated KYC Verification Modal */}
      {userId && (
        <KycModal
          isOpen={showKycModal}
          onClose={() => setShowKycModal(false)}
          userId={userId}
          userRole="talent"
          actionContext="Identity verification required to submit job applications to employers"
          onSuccess={() => {
            if (profile) setProfile({ ...profile, kyc_status: "pending" });
          }}
        />
      )}
    </DashboardShell>
  );
}

