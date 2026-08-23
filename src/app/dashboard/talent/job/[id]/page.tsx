'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import VerifiedBadge from '@/components/VerifiedBadge';
import { 
  ArrowLeft, MapPin, Briefcase, Clock, Bookmark, BookmarkCheck, 
  DollarSign, Star, Loader2, X, Upload, CheckCircle2, ShieldCheck, 
  MessageCircle, ExternalLink, Sparkles, AlertCircle, Building2, Globe,
  BarChart2, Lock, Zap
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCurrency } from '@/components/CurrencyProvider';
import KycModal from "@/components/KycModal";

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { formatCurrency } = useCurrency();

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);

  const [existingApplication, setExistingApplication] = useState<any>(null);
  const isProTalent = (profile?.subscription_tier || '').toLowerCase() === 'pro' || (profile?.subscription_tier || '').toLowerCase() === 'premium';

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

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
          
          const { data: bookmark } = await supabase
            .from('job_bookmarks')
            .select('*')
            .eq('user_id', user.id)
            .eq('job_id', id)
            .maybeSingle();
          if (bookmark) setIsBookmarked(true);

          const { data: appData } = await supabase
            .from('job_applications')
            .select('id, status, created_at')
            .eq('applicant_id', user.id)
            .eq('job_id', id)
            .maybeSingle();
          if (appData) setExistingApplication(appData);
        }
        
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        }
      } catch (error) {
        console.error('Error fetching job:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, supabase]);

  const toggleBookmark = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }
    try {
      const newStatus = !isBookmarked;
      setIsBookmarked(newStatus);
      await fetch('/api/jobs/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, jobId: id })
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleApplyClick = () => {
    if (existingApplication) {
      router.push('/dashboard/talent/applications');
      return;
    }
    // Progressive Flow: Check KYC Verification status before applying
    if (profile?.kyc_status !== "approved") {
      setShowKycModal(true);
      return;
    }
    if (job?.external_apply_url) {
      window.open(job.external_apply_url, '_blank', 'noopener,noreferrer');
      return;
    }
    const { isEarlyAccess } = getEarlyAccessDetails(job?.created_at);
    if (isEarlyAccess && !isProTalent) {
      setShowEarlyAccessModal(true);
      return;
    }
    setShowApplyModal(true);
    setApplyError(null);
    setApplySuccess(false);
    setCoverLetter('');
    setResumeFile(null);
  };

  const submitApplication = async () => {
    if (!job || !userId) return;

    if (profile?.role && profile.role !== 'talent') {
      setApplyError('Only registered talent accounts can apply for jobs.');
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
        const uploadRes = await fetch('/api/upload/image', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload resume');
        }
        const uploadData = await uploadRes.json();
        resumeUrl = uploadData.url;
      }

      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, applicantId: userId, coverLetter, resumeUrl })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit application');
      }

      setExistingApplication({ id: resData.id || 'submitted', status: 'pending', created_at: new Date().toISOString() });
      setApplySuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
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

  if (loading) {
    return (
      <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-[#C9A84C]" />
        </div>
      </DashboardShell>
    );
  }

  if (!job) {
    return (
      <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
        <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
          <h2 className="text-xl font-bold text-[#F5F3ED]">Job Listing Not Found</h2>
          <p className="text-sm text-[#A8A6B8]">This position may have been closed or removed by the poster.</p>
          <Link href="/dashboard/talent" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Browse Jobs
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const poster = job.profiles;
  const posterName = poster?.full_name || (poster?.username ? `@${poster.username}` : 'Verified Employer');

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard/talent" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#A8A6B8] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all jobs
          </Link>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
            job.category === 'web3' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            {job.category || 'Web3'} Ecosystem
          </span>
        </div>

        {/* Job Header Hero Card */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">
          {job.is_featured && (
            <div className="absolute -top-20 -right-20 bg-gradient-to-bl from-[#C9A84C]/25 to-transparent w-64 h-64 blur-3xl rounded-full pointer-events-none" />
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 relative z-10">
            {/* Company Logo */}
            <div className="w-18 h-18 sm:w-22 sm:h-22 bg-[#0A0A0F] border border-[#3A3A52] rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
              {job.company_logo_url ? (
                <img 
                  src={job.company_logo_url} 
                  alt={job.company_name || 'Company'} 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-extrabold text-[#C9A84C]">
                  {job.company_name ? job.company_name.slice(0, 2).toUpperCase() : 'JB'}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#F5F3ED] tracking-tight">
                  {job.title}
                </h1>
                {job.is_featured && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#C9A84C]/15 text-[#C9A84C] px-2.5 py-0.5 rounded-full border border-[#C9A84C]/30">
                    <Star className="h-3 w-3 fill-current" /> Featured Listing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-[#A8A6B8]">
                <span className="font-semibold text-[#F5F3ED] text-base">{job.company_name}</span>
                {job.sector && (
                  <>
                    <span>•</span>
                    <span className="text-[#C9A84C] font-medium">{job.sector}</span>
                  </>
                )}
              </div>

              {/* Key Meta Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5 bg-[#0A0A0F] border border-[#3A3A52] px-3 py-1 rounded-lg text-xs text-[#A8A6B8]">
                  <MapPin className="h-3.5 w-3.5 text-[#C9A84C]" /> 
                  <span className="capitalize">{job.location_type === 'remote' ? 'Remote' : (job.location || job.location_type)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0A0A0F] border border-[#3A3A52] px-3 py-1 rounded-lg text-xs text-[#A8A6B8]">
                  <Briefcase className="h-3.5 w-3.5 text-[#C9A84C]" /> 
                  <span className="capitalize">{job.job_type?.replace('_', '-')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0A0A0F] border border-[#3A3A52] px-3 py-1 rounded-lg text-xs text-[#A8A6B8]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#C9A84C]" /> 
                  <span className="capitalize">{job.experience_level} Level</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-3 py-1 rounded-lg text-xs text-[#C9A84C] font-bold">
                  <DollarSign className="h-3.5 w-3.5" /> 
                  <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                </div>
              </div>
            </div>
            
            {/* Top Action CTAs */}
            <div className="flex sm:flex-col items-center gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3A3A52]/60 shrink-0">
              {existingApplication ? (
                <button
                  onClick={() => router.push('/dashboard/talent/applications')}
                  className="flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/10 hover:bg-emerald-500/25 transition-all flex-1 sm:flex-initial"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Applied ({existingApplication.status ? existingApplication.status.toUpperCase() : 'SUBMITTED'})</span>
                </button>
              ) : (
                <button 
                  onClick={handleApplyClick}
                  className="flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] font-extrabold text-xs sm:text-sm py-3 px-7 rounded-xl shadow-lg shadow-[#C9A84C]/25 transition-all flex-1 sm:flex-initial"
                >
                  <span>{job.external_apply_url ? 'Apply on Company Site' : 'Apply for this Role'}</span>
                  {job.external_apply_url ? <ExternalLink className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </button>
              )}
              
              <button 
                onClick={toggleBookmark}
                className="p-3 rounded-xl border border-[#3A3A52] hover:bg-[#0A0A0F] hover:border-[#C9A84C] text-[#A8A6B8] hover:text-[#C9A84C] transition-colors flex items-center justify-center"
                title={isBookmarked ? "Remove saved job" : "Save this job"}
              >
                {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-[#C9A84C]" /> : <Bookmark className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Application Banner */}
        {existingApplication && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                  You have already applied for this role!
                </p>
                <p className="text-[11px] text-[#A8A6B8] mt-0.5">
                  Current stage: <span className="text-emerald-400 font-semibold uppercase">{existingApplication.status || 'Pending Review'}</span> • Submitted {new Date(existingApplication.created_at || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/talent/applications"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs shrink-0 transition-colors"
            >
              Track Status
            </Link>
          </div>
        )}

        {/* 24h Early Access Alert Banner */}
        {!existingApplication && job?.created_at && (() => {
          const { isEarlyAccess, hoursRemaining } = getEarlyAccessDetails(job.created_at);
          if (!isEarlyAccess) return null;
          return isProTalent ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                    ⚡ 24h Early Access Active (Pro Unlocked)
                  </p>
                  <p className="text-[11px] text-[#A8A6B8] mt-0.5">
                    As a Pro Talent member, you can apply immediately before public opening in {hoursRemaining} hours.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg shrink-0">
                PRO PRIORITY
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#1A1A2E] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                    🔒 24-Hour Early Access Window
                  </p>
                  <p className="text-[11px] text-[#A8A6B8] mt-0.5">
                    This position is in 24h Early Access for Pro Talent members. Public applications open in {hoursRemaining} hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEarlyAccessModal(true)}
                className="px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] font-bold text-xs shrink-0 transition-colors shadow-sm"
              >
                Unlock with Pro ($5/mo)
              </button>
            </div>
          );
        })()}

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Main Description (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 sm:p-8 shadow-xl">
              <h2 className="text-base sm:text-lg font-bold text-[#F5F3ED] mb-5 border-b border-[#3A3A52]/60 pb-3 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#C9A84C]" />
                Role Description & Overview
              </h2>
              <div className="text-xs sm:text-sm text-[#A8A6B8] whitespace-pre-line leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Bottom Apply Card */}
            <div className="bg-gradient-to-br from-[#1A1A2E] to-[#121224] border border-[#3A3A52] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F3ED]">
                  {existingApplication ? `Application submitted for ${job.title}` : `Ready to apply for ${job.title}?`}
                </h3>
                <p className="text-xs text-[#A8A6B8]">
                  {existingApplication ? 'You can view real-time feedback in your applications tracker.' : 'Direct submissions are reviewed personally by the hiring team.'}
                </p>
              </div>
              <button 
                onClick={handleApplyClick}
                className={`font-bold text-xs sm:text-sm py-2.5 px-6 rounded-xl transition-all shadow-md shrink-0 ${
                  existingApplication 
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' 
                    : 'bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] shadow-[#C9A84C]/20'
                }`}
              >
                {existingApplication ? 'View Status' : 'Submit Application'}
              </button>
            </div>
          </div>

          {/* Sidebar (4 Cols) */}
          <aside className="lg:col-span-4 space-y-5">
            
            {/* Required Skills */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                <Star className="h-4 w-4 text-[#C9A84C]" />
                Target Skills
              </h3>
              {job.skills && job.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill: string) => (
                    <span key={skill} className="text-xs bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] px-2.5 py-1 rounded-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#5C5A70]">No specific skill tags provided.</p>
              )}
            </div>

            {/* About the Poster / Hiring Manager */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#C9A84C]" />
                Hiring Team
              </h3>
              
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                  {poster?.avatar_url ? (
                    <img src={poster.avatar_url} alt={posterName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-[#C9A84C]">
                      {posterName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#F5F3ED] flex items-center gap-1 truncate">
                    <span>{posterName}</span>
                    <VerifiedBadge 
                      tier={poster?.subscription_tier} 
                      isVerified={poster?.is_verified} 
                      size={14} 
                    />
                  </p>
                  <p className="text-[11px] text-[#A8A6B8] capitalize mt-0.5">
                    {poster?.role || 'Employer'} • Verified Recruiter
                  </p>
                </div>
              </div>

              {/* Direct Chat with Poster */}
              <Link
                href={`/dashboard/chats?user=${poster?.id || job.posted_by}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#C9A84C]" />
                <span>Message Hiring Manager</span>
              </Link>
            </div>

            {/* Career Insights & Salary Benchmark (Pro Feature) */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-[#C9A84C]" />
                  Career Insights
                </h3>
                {isProTalent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> PRO
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#A8A6B8] bg-[#0A0A0F] px-2 py-0.5 rounded border border-[#3A3A52]">
                    <Lock className="h-2.5 w-2.5 text-[#C9A84C]" /> Pro Insights
                  </span>
                )}
              </div>

              {isProTalent ? (
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52]/60 space-y-0.5">
                    <span className="text-[#5C5A70] text-[10px] uppercase font-bold tracking-wider">Market Compensation Benchmark</span>
                    <p className="font-bold text-[#F5F3ED]">
                      {job.salary_max ? `Top quartile for ${job.sector || 'industry'} (${formatSalary(job.salary_min, job.salary_max, job.salary_currency)})` : 'Competitive market compensation'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52]/60 space-y-0.5">
                    <span className="text-[#5C5A70] text-[10px] uppercase font-bold tracking-wider">Candidate Competition</span>
                    <p className="font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Favorable • Pro applications ranked first
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52]/60 space-y-0.5">
                    <span className="text-[#5C5A70] text-[10px] uppercase font-bold tracking-wider">Recruiter Visibility</span>
                    <p className="font-bold text-[#C9A84C]">
                      Your profile includes Verified Pro Talent badge
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative pt-1 space-y-2">
                  <div className="filter blur-[1.5px] select-none pointer-events-none space-y-1.5 text-xs opacity-50">
                    <div className="p-2 bg-[#0A0A0F] rounded-lg text-[#F5F3ED]">Market Range: $95,000 - $140,000 / yr</div>
                    <div className="p-2 bg-[#0A0A0F] rounded-lg text-[#F5F3ED]">Competition: Low Candidate Volume</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0A0A0F]/90 border border-[#C9A84C]/30 space-y-2 text-center">
                    <p className="text-[11px] text-[#A8A6B8] leading-tight">
                      Unlock salary benchmarks, competition scoring, and priority recruiter visibility.
                    </p>
                    <Link
                      href="/dashboard/upgrade"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition"
                    >
                      <Zap className="h-3 w-3" /> Upgrade to Pro ($5/mo)
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Listing Summary Metadata */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">
                Position Snapshot
              </h3>
              <ul className="space-y-2.5 text-xs">
                <li className="flex justify-between items-center py-1 border-b border-[#3A3A52]/40">
                  <span className="text-[#5C5A70]">Posted On</span>
                  <span className="text-[#F5F3ED] font-medium">
                    {new Date(job.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-[#3A3A52]/40">
                  <span className="text-[#5C5A70]">Category</span>
                  <span className="text-[#F5F3ED] font-medium capitalize">{job.category || 'Web3'}</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-[#3A3A52]/40">
                  <span className="text-[#5C5A70]">Employment</span>
                  <span className="text-[#F5F3ED] font-medium capitalize">{job.job_type?.replace('_', '-')}</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="text-[#5C5A70]">Work Model</span>
                  <span className="text-[#F5F3ED] font-medium capitalize">{job.location_type}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 sm:p-7 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                {job.company_logo_url ? (
                  <img src={job.company_logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-[#C9A84C]">
                    {job.company_name ? job.company_name.slice(0, 2).toUpperCase() : 'JB'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#F5F3ED] truncate">Apply for {job.title}</h2>
                <p className="text-xs text-[#A8A6B8]">{job.company_name}</p>
              </div>
            </div>

            {applySuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-[#F5F3ED]">Application Sent!</h3>
                <p className="text-xs text-[#A8A6B8] max-w-xs mx-auto">
                  Your credentials and application have been delivered directly to {posterName}.
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
                    Cover Letter / Introduction (Optional)
                  </label>
                  <textarea 
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Introduce yourself and explain why you're uniquely suited for this role..."
                    className="w-full bg-[#0A0A0F] border border-[#3A3A52] text-sm text-[#F5F3ED] placeholder-[#5C5A70] rounded-xl p-3 focus:outline-none focus:border-[#C9A84C] resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[#F5F3ED] mb-1.5">
                    Resume Document (Optional)
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
                      {resumeFile ? resumeFile.name : 'Click to select your CV or resume PDF'}
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
      {showEarlyAccessModal && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#C9A84C]/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 text-center space-y-5">
            <button 
              onClick={() => setShowEarlyAccessModal(false)}
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
                <span className="text-[#F5F3ED] font-semibold">{job.company_name}</span> is currently accepting priority applications from Pro Talent members first.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0A0F] border border-[#3A3A52] text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#5C5A70]">Public Applications Open In</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {getEarlyAccessDetails(job.created_at).hoursRemaining} Hours
                </span>
              </div>
              <div className="w-full bg-[#1A1A2E] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#C9A84C] to-amber-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.max(10, 100 - (getEarlyAccessDetails(job.created_at).hoursRemaining / 24 * 100))}%` }}
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
                onClick={() => {
                  toggleBookmark();
                  setShowEarlyAccessModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-[#F5F3ED] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#C9A84C]" />
                <span>Save Job to Apply When Public</span>
              </button>
            </div>
          </div>
        </div>
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

