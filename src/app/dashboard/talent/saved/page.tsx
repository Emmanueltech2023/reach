'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { MapPin, Briefcase, Clock, BookmarkMinus, Bookmark, DollarSign, Star, Loader2, ArrowRight } from 'lucide-react';
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
            setSavedJobs(data || []);
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

  const formatSalary = (min: number | null, max: number | null, currency: string = 'USD') => {
    if (!min && !max) return 'Competitive';
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

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F3ED]">Saved Job Listings</h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] mt-1">Bookmarked positions ready for review and application.</p>
          </div>
          <Link
            href="/dashboard/talent"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] hover:border-[#C9A84C] text-xs font-semibold text-[#F5F3ED] transition-colors"
          >
            <span>Explore More Jobs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Job Listings */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0F] flex items-center justify-center mx-auto text-[#5C5A70]">
                <Bookmark className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3ED]">No saved jobs yet</h3>
              <p className="text-xs text-[#A8A6B8] max-w-sm mx-auto">
                Click the bookmark icon on any job in the discovery feed to save it for later.
              </p>
              <Link 
                href="/dashboard/talent" 
                className="inline-block mt-2 px-5 py-2.5 bg-[#C9A84C] text-[#0A0A0F] text-xs font-bold rounded-xl hover:bg-[#D4B55D] transition-all shadow-md shadow-[#C9A84C]/20"
              >
                Browse Open Roles
              </Link>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {savedJobs.map((job) => (
                <Link key={job.id} href={`/dashboard/talent/job/${job.id}`} className="block group">
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[#C9A84C]/60 hover:shadow-xl hover:shadow-[#C9A84C]/5 relative overflow-hidden">
                    {job.is_featured && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C9A84C]/15 to-transparent rounded-bl-3xl pointer-events-none" />
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      
                      {/* Logo */}
                      <div className="w-13 h-13 sm:w-15 sm:h-15 bg-[#0A0A0F] border border-[#3A3A52] rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                        {job.company_logo_url ? (
                          <img 
                            src={job.company_logo_url} 
                            alt={job.company_name || 'Company'} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-base sm:text-lg font-extrabold text-[#C9A84C]">
                            {job.company_name ? job.company_name.slice(0, 2).toUpperCase() : 'JB'}
                          </span>
                        )}
                      </div>
                      
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
                        </div>
                        <p className="text-xs text-[#A8A6B8]">{job.company_name}</p>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-[#5C5A70] pt-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${
                            job.category === 'web3' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}>
                            {job.category || 'Web3'}
                          </span>
                          <span className="flex items-center gap-1 text-[#A8A6B8] bg-[#0A0A0F] border border-[#3A3A52] px-2 py-0.5 rounded-md text-[11px] capitalize">
                            <MapPin className="h-3 w-3 text-[#5C5A70]" /> {job.location_type === 'remote' ? 'Remote' : (job.location || job.location_type)}
                          </span>
                          <span className="flex items-center gap-1 text-[#A8A6B8] bg-[#0A0A0F] border border-[#3A3A52] px-2 py-0.5 rounded-md text-[11px] capitalize">
                            <Briefcase className="h-3 w-3 text-[#5C5A70]" /> {job.job_type?.replace('_', '-')}
                          </span>
                          <span className="font-semibold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2 py-0.5 rounded-md text-[11px]">
                            {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                          </span>
                        </div>
                        
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {job.skills.slice(0, 4).map((skill: string) => (
                              <span key={skill} className="text-[10px] bg-[#0A0A0F] border border-[#3A3A52] text-[#A8A6B8] px-2 py-0.5 rounded-md">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3A3A52]/60 shrink-0">
                        <span className="text-xs text-[#5C5A70] flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {getRelativeTime(job.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => removeBookmark(job.id, e)}
                            className="p-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 text-red-400 transition-colors"
                            title="Remove from saved jobs"
                          >
                            <BookmarkMinus className="h-4 w-4" />
                          </button>

                          <span className="text-xs font-bold text-[#C9A84C] px-4 py-2 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 hover:bg-[#C9A84C] hover:text-[#0A0A0F] transition-all">
                            View & Apply
                          </span>
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
