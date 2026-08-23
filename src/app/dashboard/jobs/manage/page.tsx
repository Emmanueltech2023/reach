'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  Briefcase, Plus, Users, MapPin, Edit, Eye, EyeOff, Building2, ExternalLink, Sparkles
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
  company_name: string;
  company_logo_url: string | null;
  category: string;
  job_type: string;
  location_type: string;
  location: string | null;
  created_at: string;
  is_published: boolean;
  external_apply_url: string | null;
  job_applications: { count: number }[];
}

export default function ManageJobsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfileAndJobs() {
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

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch jobs via API route (uses service role key, no RLS issues)
        const jobsRes = await fetch(`/api/jobs?postedBy=${user.id}`);
        const jobsJson = await jobsRes.json();

        if (!jobsRes.ok) throw new Error(jobsJson.error || 'Failed to fetch jobs');

        // Also fetch application counts for each job
        const appsRes = await fetch(`/api/jobs/applications?posterId=${user.id}`);
        const appsJson = await appsRes.json();
        const appsList = Array.isArray(appsJson) ? appsJson : (appsJson.applications || []);
        
        const appCounts: Record<string, number> = {};
        for (const app of appsList) {
          const jid = app.job_id;
          if (jid) {
            appCounts[jid] = (appCounts[jid] || 0) + 1;
          }
        }

        const jobsWithCounts = (jobsJson.jobs || []).map((j: any) => ({
          ...j,
          job_applications: [{ count: appCounts[j.id] || 0 }],
        }));
        setJobs(jobsWithCounts as Job[]);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfileAndJobs();
  }, [supabase, router]);

  const togglePublishStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_published: !currentStatus })
        .eq('id', jobId);

      if (error) throw error;

      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, is_published: !currentStatus } : job
      ));
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatJobType = (type: string) => {
    if (!type) return 'Full Time';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8 p-3 sm:p-6 animate-in fade-in duration-300">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F3ED]">Manage Posted Jobs</h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] mt-1">Review active recruitment listings, track candidates, and edit postings.</p>
          </div>
          <Link
            href="/dashboard/jobs/post"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0A0A0F] shadow-lg shadow-[#C9A84C]/20 transition-all hover:bg-[#D4B55D]"
          >
            <Plus className="h-4 w-4" />
            <span>Post New Listing</span>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] py-16 px-4 text-center shadow-xl">
            <div className="mb-4 rounded-full bg-[#0A0A0F] p-4 shadow-inner">
              <Briefcase className="h-10 w-10 text-[#5C5A70]" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-[#F5F3ED]">No active listings posted yet</h3>
            <p className="mb-5 max-w-sm text-xs sm:text-sm text-[#A8A6B8]">
              Reach top talent in Web2 and Web3. Create your first job listing to receive applications.
            </p>
            <Link
              href="/dashboard/jobs/post"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-6 py-2.5 text-xs font-bold text-[#0A0A0F] hover:bg-[#D4B55D] transition-all shadow-md shadow-[#C9A84C]/20"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Job</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const applicantsCount = job.job_applications?.[0]?.count || 0;
              const isExternal = !!job.external_apply_url;

              return (
                <div key={job.id} className="group flex flex-col rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] shadow-xl transition-all hover:border-[#C9A84C]/40 hover:shadow-2xl overflow-hidden">
                  <div className="flex-1 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#C9A84C]/10 border border-[#C9A84C]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
                          {job.category}
                        </span>
                        {!job.is_published ? (
                          <span className="rounded-md bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-400">
                            Draft
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
                            Active
                          </span>
                        )}
                        {isExternal && (
                          <span className="rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-400">
                            External
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => togglePublishStatus(job.id, job.is_published)}
                        className="text-[#5C5A70] transition-colors hover:text-[#F5F3ED] p-1"
                        title={job.is_published ? "Unpublish listing" : "Publish listing"}
                      >
                        {job.is_published ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0">
                        {job.company_logo_url ? (
                          <img src={job.company_logo_url} alt={job.company_name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-sm font-extrabold text-[#C9A84C]">
                            {job.company_name ? job.company_name.slice(0, 2).toUpperCase() : 'JB'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-[#F5F3ED] line-clamp-1 group-hover:text-[#C9A84C] transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-xs text-[#A8A6B8] truncate mt-0.5">{job.company_name}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#5C5A70] pt-1">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-[#A8A6B8]" />
                        <span className="text-[#A8A6B8] capitalize">{formatJobType(job.job_type)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#A8A6B8]" />
                        <span className="text-[#A8A6B8] capitalize">{job.location_type === 'remote' ? 'Remote' : job.location || 'Hybrid/Onsite'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#3A3A52]/80 bg-[#0A0A0F]/60 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5C5A70]">Posted {formatDate(job.created_at)}</span>
                      <div className="flex items-center font-bold text-[#C9A84C] gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{applicantsCount} {applicantsCount === 1 ? 'Applicant' : 'Applicants'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isExternal ? (
                        <Link 
                          href={`/dashboard/jobs/applicants/${job.id}`}
                          className="flex-1 rounded-xl bg-[#2A2A42] hover:bg-[#3A3A52] py-2 text-center text-xs font-bold text-[#F5F3ED] transition-colors border border-[#3A3A52]"
                        >
                          Review Applicants ({applicantsCount})
                        </Link>
                      ) : (
                        <div className="flex-1 rounded-xl bg-[#1A1A2E] py-2 text-center text-xs font-medium text-[#5C5A70] border border-[#3A3A52]">
                          External Apply
                        </div>
                      )}
                      
                      <Link 
                        href={`/dashboard/talent/job/${job.id}`}
                        className="flex items-center justify-center rounded-xl border border-[#3A3A52] p-2 text-[#A8A6B8] transition-colors hover:bg-[#2A2A42] hover:text-[#F5F3ED]"
                        title="Preview listing"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
