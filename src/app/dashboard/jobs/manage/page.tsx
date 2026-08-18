'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { 
  Briefcase, Plus, Users, MapPin, Edit, Eye, EyeOff, Building2, ExternalLink
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
        const appCounts: Record<string, number> = {};
        if (appsRes.ok && Array.isArray(appsJson.applications)) {
          for (const app of appsJson.applications) {
            const jid = app.job_id;
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
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F5F3ED]">Manage Jobs</h1>
            <p className="text-[#A8A6B8]">View and manage your posted job listings</p>
          </div>
          <Link
            href="/dashboard/jobs/post"
            className="flex items-center space-x-2 rounded-xl bg-[#C9A84C] px-5 py-2.5 text-sm font-bold text-[#0A0A0F] shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-all hover:bg-[#D4B55D] hover:shadow-[0_0_25px_rgba(201,168,76,0.5)]"
          >
            <Plus className="h-5 w-5" />
            <span>Post New Job</span>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] py-20 text-center shadow-xl">
            <div className="mb-4 rounded-full bg-[#0A0A0F] p-5 shadow-inner">
              <Briefcase className="h-12 w-12 text-[#5C5A70]" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[#F5F3ED]">No jobs posted yet</h3>
            <p className="mb-6 max-w-sm text-[#A8A6B8]">
              You haven't posted any job listings yet. Create your first listing to start finding great talent.
            </p>
            <Link
              href="/dashboard/jobs/post"
              className="flex items-center space-x-2 rounded-xl bg-[#2A2A42] px-6 py-3 text-sm font-medium text-[#F5F3ED] transition-colors hover:bg-[#3A3A52]"
            >
              <Plus className="h-5 w-5" />
              <span>Post Your First Job</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const applicantsCount = job.job_applications?.[0]?.count || 0;
              const isExternal = !!job.external_apply_url;

              return (
                <div key={job.id} className="group flex flex-col rounded-2xl border border-[#3A3A52] bg-[#1A1A2E] shadow-xl transition-all hover:border-[#4A4A62] hover:shadow-2xl">
                  <div className="flex-1 p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-md bg-[#C9A84C]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">
                          {job.category}
                        </span>
                        {!job.is_published && (
                          <span className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-red-400">
                            Draft
                          </span>
                        )}
                        {isExternal && (
                          <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-blue-400">
                            External
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => togglePublishStatus(job.id, job.is_published)}
                        className="text-[#5C5A70] transition-colors hover:text-[#F5F3ED]"
                        title={job.is_published ? "Unpublish" : "Publish"}
                      >
                        {job.is_published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </button>
                    </div>

                    <h3 className="mb-1 text-lg font-bold text-[#F5F3ED] line-clamp-1">{job.title}</h3>
                    
                    <div className="mb-4 flex items-center text-sm text-[#A8A6B8]">
                      <Building2 className="mr-1.5 h-4 w-4" />
                      <span className="truncate">{job.company_name}</span>
                    </div>

                    <div className="space-y-2 text-sm text-[#5C5A70]">
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>{formatJobType(job.job_type)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{job.location_type === 'remote' ? 'Remote' : job.location || 'Hybrid/Onsite'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#3A3A52] bg-[#0A0A0F]/50 p-4">
                    <div className="mb-4 flex items-center justify-between text-sm">
                      <span className="text-[#5C5A70]">Posted {formatDate(job.created_at)}</span>
                      <div className="flex items-center font-medium text-[#C9A84C]">
                        <Users className="mr-1.5 h-4 w-4" />
                        <span>{applicantsCount} Applicants</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!isExternal ? (
                        <Link 
                          href={`/dashboard/jobs/applicants/${job.id}`}
                          className="flex-1 rounded-xl bg-[#2A2A42] py-2 text-center text-sm font-medium text-[#F5F3ED] transition-colors hover:bg-[#3A3A52]"
                        >
                          View Applicants
                        </Link>
                      ) : (
                        <div className="flex-1 rounded-xl bg-[#1A1A2E] py-2 text-center text-sm font-medium text-[#5C5A70] border border-[#3A3A52]">
                          External Apply
                        </div>
                      )}
                      
                      <button className="flex items-center justify-center rounded-xl border border-[#3A3A52] p-2 text-[#A8A6B8] transition-colors hover:bg-[#2A2A42] hover:text-[#F5F3ED]">
                        <Edit className="h-4 w-4" />
                      </button>
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
