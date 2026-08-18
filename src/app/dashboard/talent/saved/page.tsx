'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { MapPin, Briefcase, Clock, BookmarkMinus, Bookmark, DollarSign, Star, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCurrency } from '@/components/CurrencyProvider';

export default function SavedJobsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { formatCurrency } = useCurrency();

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role, full_name, username')
            .eq('id', user.id)
            .single();
          setProfile(profileData);
          setUserId(user.id);
          
          const res = await fetch(`/api/jobs/bookmarks?userId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setSavedJobs(data);
          } else {
            setSavedJobs([
              {
                id: '1', title: 'Senior Frontend Engineer', company_name: 'TechCorp', category: 'web2',
                location_type: 'remote', job_type: 'full-time', experience_level: 'senior',
                salary_min: 120000, salary_max: 150000, skills: ['React', 'TypeScript', 'Next.js'],
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(), is_featured: true, company_logo: 'TC'
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const removeBookmark = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setSavedJobs(prev => prev.filter(job => job.id !== jobId));
      await fetch('/api/jobs/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, jobId })
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return 'Competitive';
    if (min && !max) return `${formatCurrency(min, { convertFromUSD: true })}+`;
    if (!min && max) return `Up to ${formatCurrency(max, { convertFromUSD: true })}`;
    return `${formatCurrency(min, { convertFromUSD: true })} - ${formatCurrency(max, { convertFromUSD: true })}`;
  };

  const getRelativeTime = (dateStr: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return rtf.format(daysDifference, 'day');
  };

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#F5F3ED]">Saved Jobs</h1>
          <p className="mt-2 text-[#A8A6B8]">Review and apply to jobs you've bookmarked.</p>
        </div>

        {/* Job Listings */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="text-center py-20 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52]">
              <Bookmark className="h-12 w-12 text-[#5C5A70] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#F5F3ED]">No saved jobs</h3>
              <p className="text-[#A8A6B8] mt-2">Jobs you bookmark will appear here.</p>
              <Link href="/dashboard/talent" className="inline-block mt-6 px-6 py-2 bg-[#C9A84C] text-[#0A0A0F] font-semibold rounded-lg hover:bg-[#b09342] transition-colors">
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {savedJobs.map((job) => (
                <Link key={job.id} href={`/dashboard/talent/job/${job.id}`} className="block group">
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 transition-all duration-300 hover:border-[#C9A84C]/50 hover:shadow-lg hover:shadow-[#C9A84C]/5 relative overflow-hidden">
                    {job.is_featured && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#C9A84C]/20 to-transparent w-32 h-32 blur-3xl rounded-full" />
                    )}
                    <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                      
                      <div className="h-16 w-16 bg-[#0F0F1A] border border-[#3A3A52] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {job.company_logo && job.company_logo.length <= 2 ? (
                          <span className="text-xl font-bold text-[#A8A6B8]">{job.company_logo}</span>
                        ) : (
                          <span className="text-xl font-bold text-[#A8A6B8]">{job.company_name?.charAt(0)}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-[#F5F3ED] group-hover:text-[#C9A84C] transition-colors">{job.title}</h3>
                          {job.is_featured && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded-full border border-[#C9A84C]/20">
                              <Star className="h-3 w-3 fill-current" /> Featured
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#A8A6B8]">{job.company_name}</p>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-[#5C5A70]">
                          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${job.category === 'web3' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                            {job.category === 'web3' ? 'Web3' : 'Web2'}
                          </span>
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location_type}</span>
                          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.job_type}</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {formatSalary(job.salary_min, job.salary_max)}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.skills?.slice(0, 4).map((skill: string) => (
                            <span key={skill} className="text-xs bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] px-2 py-1 rounded-md">
                              {skill}
                            </span>
                          ))}
                          {job.skills?.length > 4 && (
                            <span className="text-xs text-[#5C5A70] px-1 py-1">+{job.skills.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col items-center justify-between gap-3 shrink-0 ml-auto pt-4 md:pt-0 border-t md:border-t-0 border-[#3A3A52]">
                        <span className="text-xs text-[#5C5A70] flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {getRelativeTime(job.created_at)}
                        </span>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => removeBookmark(job.id, e)}
                            className="p-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 text-red-500/80 transition-colors"
                            title="Remove from saved"
                          >
                            <BookmarkMinus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
