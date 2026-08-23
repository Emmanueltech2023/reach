'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import VerifiedBadge from '@/components/VerifiedBadge';
import { 
  ArrowLeft, Search, Filter, MessageSquare, Download, CheckCircle2, 
  XCircle, Star, BadgeCheck, MapPin, FileText, ExternalLink, Loader2, Sparkles,
  User, Globe, Link2, X
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
  username: string;
}

interface Job {
  id: string;
  title: string;
}

interface Applicant {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_url: string | null;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    trust_score: number;
    bio: string | null;
    country: string | null;
    subscription_tier?: string;
    website?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
    category?: string | null;
    investment_focus?: string[] | null;
  };
}

export default function ViewApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const supabase = useMemo(() => createClient(), []);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchData() {
      if (!jobId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, full_name, username')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        const { data: jobData } = await supabase
          .from('jobs')
          .select('id, title')
          .eq('id', jobId)
          .single();
        setJob(jobData);

        // Fetch applications from API
        const res = await fetch(`/api/jobs/applications?jobId=${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setApplicants(data || []);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, router, jobId]);

  const [previewResume, setPreviewResume] = useState<{ url: string; name: string } | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null);

  const updateStatus = async (applicationId: string, status: string) => {
    setUpdatingId(applicationId);
    try {
      const res = await fetch('/api/jobs/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to update status');
      }

      setApplicants(applicants.map(app => 
        app.id === applicationId ? { ...app, status } : app
      ));
      if (selectedCandidate && selectedCandidate.id === applicationId) {
        setSelectedCandidate({ ...selectedCandidate, status });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Sort Pro Talent candidates to top for priority recruiter visibility
  const filteredApplicants = applicants
    .filter(app => {
      if (filter === 'All') return true;
      return app.status.toLowerCase() === filter.toLowerCase();
    })
    .sort((a, b) => {
      const aTier = (a.profiles?.subscription_tier || '').toLowerCase();
      const bTier = (b.profiles?.subscription_tier || '').toLowerCase();
      const aIsPro = aTier === 'pro' || aTier === 'premium';
      const bIsPro = bTier === 'pro' || bTier === 'premium';
      if (aIsPro && !bIsPro) return -1;
      if (!aIsPro && bIsPro) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getInitials = (name: string) => {
    if (!name) return 'CD';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8 p-3 sm:p-6 animate-in fade-in duration-300">
        
        <div className="flex items-center gap-3.5">
          <Link 
            href="/dashboard/jobs/manage"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A2E] text-[#A8A6B8] border border-[#3A3A52] transition-colors hover:border-[#C9A84C] hover:text-[#F5F3ED]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[#F5F3ED]">
              Applicants for {job?.title || 'Listing'}
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] mt-0.5">
              Review candidates, examine cover letters, and manage hiring pipeline.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-2 rounded-xl border border-[#3A3A52] bg-[#1A1A2E] p-1 shadow-sm">
            {['All', 'Pending', 'Shortlisted', 'Hired', 'Rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filter === f 
                    ? 'bg-[#C9A84C] text-[#0A0A0F] shadow' 
                    : 'text-[#A8A6B8] hover:text-[#F5F3ED]'
                }`}
              >
                <span>{f}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  filter === f ? 'bg-[#0A0A0F]/20 text-[#0A0A0F]' : 'bg-[#0A0A0F] text-[#5C5A70]'
                }`}>
                  {f === 'All' ? applicants.length : applicants.filter(a => a.status.toLowerCase() === f.toLowerCase()).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredApplicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] py-16 px-4 text-center shadow-xl">
            <div className="mb-4 rounded-full bg-[#0A0A0F] p-4 shadow-inner">
              <Filter className="h-8 w-8 text-[#5C5A70]" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-[#F5F3ED]">No applicants in this category</h3>
            <p className="text-xs text-[#A8A6B8] max-w-sm">
              There are currently no candidates matching the '{filter}' filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplicants.map((app) => {
              const candProfile = app.profiles || ({} as any);
              const candName = candProfile.full_name || `@${candProfile.username}` || 'Candidate';
              const isBusy = updatingId === app.id;
              const isProTalent = (candProfile.subscription_tier || '').toLowerCase() === 'pro' || (candProfile.subscription_tier || '').toLowerCase() === 'premium';

              return (
                <div 
                  key={app.id} 
                  className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-all space-y-4 ${
                    isProTalent 
                      ? 'bg-gradient-to-br from-[#1A1A2E] to-[#1F1E32] border-[#C9A84C]/40 shadow-[0_0_15px_rgba(201,168,76,0.06)] hover:border-[#C9A84C]' 
                      : 'bg-[#1A1A2E] border-[#3A3A52] hover:border-[#4A4A62]'
                  }`}
                >
                  
                  {/* Top Candidate Profile Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div 
                      onClick={() => setSelectedCandidate(app)}
                      className="flex items-center gap-3.5 cursor-pointer group/cand select-none"
                    >
                      <div className="w-13 h-13 rounded-full bg-[#0A0A0F] border border-[#3A3A52] group-hover/cand:border-[#C9A84C] overflow-hidden flex items-center justify-center shrink-0 transition-colors">
                        {candProfile.avatar_url ? (
                          <img src={candProfile.avatar_url} alt={candName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-extrabold text-[#C9A84C]">
                            {getInitials(candName)}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-base font-bold text-[#F5F3ED] group-hover/cand:text-[#C9A84C] transition-colors">{candName}</h3>
                          <VerifiedBadge 
                            tier={candProfile.subscription_tier} 
                            isVerified={candProfile.is_verified} 
                            size={15} 
                          />
                          {isProTalent && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] uppercase tracking-wider ml-1">
                              <Sparkles className="h-2.5 w-2.5" /> PRO TALENT
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A8A6B8]">
                          {candProfile.username && <span>@{candProfile.username}</span>}
                          {candProfile.country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#5C5A70]" />
                              {candProfile.country}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[#C9A84C]">
                            <Star className="h-3 w-3" />
                            Score: {candProfile.trust_score || 85}
                          </span>
                          <span className="text-[#5C5A70]">
                            • Applied {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      app.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                      app.status === 'shortlisted' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' :
                      app.status === 'hired' ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                      'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  {/* Bio snippet if available */}
                  {candProfile.bio && (
                    <p className="text-xs text-[#A8A6B8] line-clamp-2 bg-[#0A0A0F]/40 p-2.5 rounded-xl border border-[#3A3A52]/40">
                      {candProfile.bio}
                    </p>
                  )}

                  {/* Cover Letter */}
                  {app.cover_letter && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-[#F5F3ED]">Cover Note</span>
                      <div className="rounded-xl bg-[#0A0A0F] border border-[#3A3A52]/60 p-3.5 text-xs text-[#A8A6B8] leading-relaxed whitespace-pre-wrap">
                        {app.cover_letter}
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#3A3A52]/60">
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedCandidate(app)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] px-3.5 py-2 text-xs font-semibold text-[#F5F3ED] transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-[#C9A84C]" />
                        <span>View Profile</span>
                      </button>

                      {app.resume_url ? (
                        <button 
                          type="button"
                          onClick={() => setPreviewResume({ url: app.resume_url!, name: candName })}
                          className="flex items-center gap-1.5 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] px-3.5 py-2 text-xs font-semibold text-[#F5F3ED] transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#C9A84C]" />
                          <span>Resume In-App</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[#5C5A70] italic">No resume attached</span>
                      )}

                      <Link
                        href={`/dashboard/chats?user=${candProfile.id}`}
                        className="flex items-center gap-1.5 rounded-xl border border-[#3A3A52] hover:border-[#C9A84C] px-3.5 py-2 text-xs font-semibold text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#C9A84C]" />
                        <span>Direct Message</span>
                      </Link>
                    </div>

                    {/* Candidate Stage Status Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {app.status !== 'rejected' && (
                        <button 
                          disabled={isBusy}
                          onClick={() => updateStatus(app.id, 'rejected')}
                          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      )}
                      
                      {app.status !== 'shortlisted' && app.status !== 'hired' && (
                        <button 
                          disabled={isBusy}
                          onClick={() => updateStatus(app.id, 'shortlisted')}
                          className="flex items-center gap-1 rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                          <span>Shortlist</span>
                        </button>
                      )}

                      {app.status !== 'hired' && (
                        <button 
                          disabled={isBusy}
                          onClick={() => updateStatus(app.id, 'hired')}
                          className="flex items-center gap-1 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] px-4 py-1.5 text-xs font-bold text-[#0A0A0F] shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hire Candidate</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* In-App Resume Preview Modal */}
        {previewResume && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#3A3A52] bg-[#0A0A0F]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-[#C9A84C] shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-[#F5F3ED] truncate">
                    {previewResume.name} — Resume Document
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewResume.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] hover:border-[#C9A84C] transition-colors"
                    title="Open in new window"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setPreviewResume(null)}
                    className="p-2 rounded-lg bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body: Embedded Viewer */}
              <div className="flex-1 p-3 sm:p-5 bg-[#0F0F1A] overflow-auto flex items-center justify-center min-h-[60vh]">
                {/\.(jpg|jpeg|png|webp|gif)$/i.test(previewResume.url) ? (
                  <img 
                    src={previewResume.url} 
                    alt="Resume document" 
                    className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain border border-[#3A3A52]"
                  />
                ) : (
                  <iframe
                    src={previewResume.url.includes('.pdf') ? previewResume.url : `https://docs.google.com/viewer?url=${encodeURIComponent(previewResume.url)}&embedded=true`}
                    title="Resume Document Viewer"
                    className="w-full h-[72vh] rounded-xl border border-[#3A3A52] bg-white/5"
                  />
                )}
              </div>

            </div>
          </div>
        )}

        {/* Candidate Profile Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header Banner */}
              <div className="p-6 border-b border-[#3A3A52] bg-gradient-to-r from-[#0A0A0F] via-[#121224] to-[#1A1A2E] relative">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-[#0A0A0F]/80 border border-[#3A3A52] text-[#A8A6B8] hover:text-[#F5F3ED] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                    {selectedCandidate.profiles?.avatar_url ? (
                      <img 
                        src={selectedCandidate.profiles.avatar_url} 
                        alt={selectedCandidate.profiles.full_name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xl font-extrabold text-[#C9A84C]">
                        {getInitials(selectedCandidate.profiles?.full_name || 'Candidate')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 pr-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-[#F5F3ED]">
                        {selectedCandidate.profiles?.full_name || 'Candidate'}
                      </h2>
                      <VerifiedBadge 
                        tier={selectedCandidate.profiles?.subscription_tier} 
                        isVerified={selectedCandidate.profiles?.is_verified} 
                        size={16} 
                      />
                      {((selectedCandidate.profiles?.subscription_tier || '').toLowerCase() === 'pro' || (selectedCandidate.profiles?.subscription_tier || '').toLowerCase() === 'premium') && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] uppercase tracking-wider">
                          <Sparkles className="h-3 w-3" /> PRO TALENT
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A8A6B8]">
                      {selectedCandidate.profiles?.username && <span>@{selectedCandidate.profiles.username}</span>}
                      {selectedCandidate.profiles?.country && (
                        <span className="flex items-center gap-1 text-[#F5F3ED]">
                          <MapPin className="h-3.5 w-3.5 text-[#C9A84C]" />
                          {selectedCandidate.profiles.country}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[#C9A84C]">
                        <Star className="h-3.5 w-3.5" />
                        Trust Score: {selectedCandidate.profiles?.trust_score || 85}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#0F0F1A]">
                
                {/* About / Bio */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#C9A84C]" />
                    About Candidate
                  </h4>
                  <div className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] text-xs sm:text-sm text-[#A8A6B8] leading-relaxed whitespace-pre-line">
                    {selectedCandidate.profiles?.bio || "No bio has been added to this candidate's profile yet."}
                  </div>
                </div>

                {/* Professional Links */}
                {(selectedCandidate.profiles?.website || selectedCandidate.profiles?.linkedin || selectedCandidate.profiles?.twitter) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">
                      Portfolio & Social Profiles
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedCandidate.profiles?.website && (
                        <a
                          href={selectedCandidate.profiles.website.startsWith('http') ? selectedCandidate.profiles.website : `https://${selectedCandidate.profiles.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
                        >
                          <Globe className="h-3.5 w-3.5 text-[#C9A84C]" />
                          <span>Portfolio Website</span>
                          <ExternalLink className="h-3 w-3 text-[#5C5A70]" />
                        </a>
                      )}
                      {selectedCandidate.profiles?.linkedin && (
                        <a
                          href={selectedCandidate.profiles.linkedin.startsWith('http') ? selectedCandidate.profiles.linkedin : `https://${selectedCandidate.profiles.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 text-[#0A66C2] fill-current" viewBox="0 0 24 24">
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
                          </svg>
                          <span>LinkedIn Profile</span>
                          <ExternalLink className="h-3 w-3 text-[#5C5A70]" />
                        </a>
                      )}
                      {selectedCandidate.profiles?.twitter && (
                        <a
                          href={selectedCandidate.profiles.twitter.startsWith('http') ? selectedCandidate.profiles.twitter : `https://x.com/${selectedCandidate.profiles.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A1A2E] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 text-[#F5F3ED] fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>X / Twitter</span>
                          <ExternalLink className="h-3 w-3 text-[#5C5A70]" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Focus Areas / Skills */}
                {selectedCandidate.profiles?.investment_focus && selectedCandidate.profiles.investment_focus.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider">
                      Focus Skills & Domain Experience
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.profiles.investment_focus.map((tag: string) => (
                        <span key={tag} className="text-xs bg-[#1A1A2E] border border-[#3A3A52] text-[#A8A6B8] px-2.5 py-1 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Submission Note */}
                {selectedCandidate.cover_letter && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#F5F3ED] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-[#C9A84C]" />
                      Cover Note For This Job
                    </h4>
                    <div className="p-4 rounded-2xl bg-[#0A0A0F] border border-[#3A3A52]/60 text-xs text-[#A8A6B8] leading-relaxed whitespace-pre-wrap">
                      {selectedCandidate.cover_letter}
                    </div>
                  </div>
                )}

                {/* Resume In-App Trigger */}
                {selectedCandidate.resume_url && (
                  <div className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#3A3A52] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] flex items-center justify-center text-[#C9A84C]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">Attached Resume & CV</p>
                        <p className="text-[11px] text-[#5C5A70]">Document ready for preview</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewResume({ 
                        url: selectedCandidate.resume_url!, 
                        name: selectedCandidate.profiles?.full_name || 'Candidate' 
                      })}
                      className="px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition-colors"
                    >
                      Preview Resume In-App
                    </button>
                  </div>
                )}

              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-[#3A3A52] bg-[#0A0A0F] flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/dashboard/chats?user=${selectedCandidate.profiles?.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-bold text-[#F5F3ED] transition-colors"
                >
                  <MessageSquare className="h-4 w-4 text-[#C9A84C]" />
                  <span>Start Interview Chat</span>
                </Link>

                <div className="flex items-center gap-2">
                  {selectedCandidate.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'rejected')}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                  {selectedCandidate.status !== 'shortlisted' && selectedCandidate.status !== 'hired' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'shortlisted')}
                      className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors"
                    >
                      Shortlist
                    </button>
                  )}
                  {selectedCandidate.status !== 'hired' && (
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, 'hired')}
                      className="px-4 py-2 rounded-xl bg-[#C9A84C] hover:bg-[#D4B55D] text-[#0A0A0F] text-xs font-bold transition-all shadow-md shadow-[#C9A84C]/20"
                    >
                      Hire Candidate
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
