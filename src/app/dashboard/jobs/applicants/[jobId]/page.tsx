'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  ArrowLeft, Search, Filter, MessageSquare, Download, CheckCircle2, 
  XCircle, Star, BadgeCheck, MapPin, FileText
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

        const { data: profileData } = await supabase
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

        const { data: appsData, error } = await supabase
          .from('job_applications')
          .select(`
            *,
            profiles(id, full_name, username, avatar_url, is_verified, trust_score, bio, country)
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplicants(appsData as unknown as Applicant[]);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, router, jobId]);

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      // In a real app, you would PATCH to /api/jobs/applications 
      const { error } = await supabase
        .from('job_applications')
        .update({ status })
        .eq('id', applicationId);

      if (error) throw error;

      setApplicants(applicants.map(app => 
        app.id === applicationId ? { ...app, status } : app
      ));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filteredApplicants = applicants.filter(app => {
    if (filter === 'All') return true;
    return app.status.toLowerCase() === filter.toLowerCase();
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/jobs/manage"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A2E] text-[#A8A6B8] transition-colors hover:bg-[#2A2A42] hover:text-[#F5F3ED]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3ED] md:text-3xl">Applicants for {job?.title}</h1>
            <p className="text-[#A8A6B8]">Review and manage candidates for this role</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex space-x-2 rounded-xl border border-[#3A3A52] bg-[#1A1A2E] p-1 shadow-sm">
            {['All', 'Pending', 'Shortlisted', 'Hired', 'Rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-[#2A2A42] text-[#F5F3ED] shadow' 
                    : 'text-[#A8A6B8] hover:text-[#F5F3ED]'
                }`}
              >
                {f} 
                <span className="ml-2 rounded-full bg-[#0A0A0F] px-2 py-0.5 text-xs text-[#5C5A70]">
                  {f === 'All' ? applicants.length : applicants.filter(a => a.status.toLowerCase() === f.toLowerCase()).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredApplicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] py-20 text-center shadow-xl">
            <div className="mb-4 rounded-full bg-[#0A0A0F] p-5 shadow-inner">
              <Filter className="h-12 w-12 text-[#5C5A70]" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[#F5F3ED]">No applicants found</h3>
            <p className="max-w-sm text-[#A8A6B8]">
              There are no applicants matching the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredApplicants.map((app) => (
              <div key={app.id} className="rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] p-6 shadow-xl transition-all hover:border-[#4A4A62]">
                <div className="flex flex-col gap-6 md:flex-row">
                  {/* Avatar & Basic Info */}
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2A2A42] to-[#1A1A2E] text-xl font-bold text-[#C9A84C] shadow-inner ring-2 ring-[#3A3A52]">
                      {app.profiles.avatar_url ? (
                        <img src={app.profiles.avatar_url} alt={app.profiles.full_name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        getInitials(app.profiles.full_name)
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-[#F5F3ED]">{app.profiles.full_name}</h3>
                          {app.profiles.is_verified && <BadgeCheck className="h-5 w-5 text-blue-400" />}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          app.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          app.status === 'shortlisted' ? 'bg-blue-500/10 text-blue-400' :
                          app.status === 'hired' ? 'bg-[#C9A84C]/10 text-[#C9A84C]' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#A8A6B8]">
                        <span>@{app.profiles.username}</span>
                        {app.profiles.country && (
                          <div className="flex items-center">
                            <MapPin className="mr-1 h-3.5 w-3.5 text-[#5C5A70]" />
                            {app.profiles.country}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Star className="mr-1 h-3.5 w-3.5 text-[#C9A84C]" />
                          Trust Score: {app.profiles.trust_score}
                        </div>
                        <span className="text-[#5C5A70]">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {app.profiles.bio && (
                        <p className="text-sm text-[#A8A6B8] line-clamp-2 mt-2">{app.profiles.bio}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#3A3A52] pt-6">
                  {app.cover_letter && (
                    <div className="mb-6">
                      <h4 className="mb-2 text-sm font-medium text-[#F5F3ED]">Cover Letter</h4>
                      <div className="rounded-xl bg-[#0A0A0F] p-4 text-sm text-[#A8A6B8]">
                        <p className="whitespace-pre-wrap">{app.cover_letter}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-3">
                      {app.resume_url && (
                        <a 
                          href={app.resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 rounded-xl bg-[#2A2A42] px-4 py-2 text-sm font-medium text-[#F5F3ED] transition-colors hover:bg-[#3A3A52]"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Resume</span>
                          <Download className="ml-1 h-3 w-3 text-[#5C5A70]" />
                        </a>
                      )}
                      <Link
                        href={`/dashboard/chats?user=${app.profiles.id}`}
                        className="flex items-center space-x-2 rounded-xl border border-[#3A3A52] px-4 py-2 text-sm font-medium text-[#A8A6B8] transition-colors hover:bg-[#2A2A42] hover:text-[#F5F3ED]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Chat</span>
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      {app.status !== 'rejected' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'rejected')}
                          className="flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      )}
                      
                      {app.status !== 'shortlisted' && app.status !== 'hired' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'shortlisted')}
                          className="flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/10"
                        >
                          <Star className="h-4 w-4" />
                          <span>Shortlist</span>
                        </button>
                      )}

                      {app.status !== 'hired' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'hired')}
                          className="flex items-center space-x-1 rounded-lg bg-[#C9A84C]/10 px-3 py-2 text-sm font-medium text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/20"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Hire</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
