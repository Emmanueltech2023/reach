'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { Search, MapPin, Briefcase, Clock, Bookmark, BookmarkCheck, DollarSign, Star, Loader2, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/components/CurrencyProvider';

export default function TalentDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [jobType, setJobType] = useState('All');
  const [location, setLocation] = useState('All');
  const [experience, setExperience] = useState('All');

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          
          const { data: bookmarks } = await supabase
            .from('job_bookmarks')
            .select('job_id')
            .eq('user_id', user.id);
          if (bookmarks) {
            setBookmarkedJobs(new Set(bookmarks.map(b => b.job_id)));
          }
        }
        
        const res = await fetch('/api/jobs');
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || data);
        } else {
          setJobs([
            {
              id: '1', title: 'Senior Frontend Engineer', company_name: 'TechCorp', category: 'web2',
              location_type: 'remote', job_type: 'full-time', experience_level: 'senior',
              salary_min: 120000, salary_max: 150000, skills: ['React', 'TypeScript', 'Next.js'],
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(), is_featured: true, company_logo: 'TC'
            },
            {
              id: '2', title: 'Smart Contract Developer', company_name: 'DeFi Protocol', category: 'web3',
              location_type: 'remote', job_type: 'contract', experience_level: 'mid',
              salary_min: 100000, salary_max: 140000, skills: ['Solidity', 'Hardhat', 'Ethers.js'],
              created_at: new Date(Date.now() - 86400000 * 5).toISOString(), is_featured: false, company_logo: 'DP'
            }
          ]);
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

  const submitApplication = async () => {
    if (!applyingJob) return;
    setIsSubmitting(true);
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
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          resumeUrl = url;
        }
      }

      await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: applyingJob.id,
          applicantId: userId,
          coverLetter,
          resumeUrl
        })
      });
      setApplyingJob(null);
      setCoverLetter('');
      setResumeFile(null);
    } catch (error) {
      console.error('Error applying:', error);
    } finally {
      setIsSubmitting(false);
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(search.toLowerCase()) || job.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || job.category === category.toLowerCase();
    const matchesType = jobType === 'All' || job.job_type === jobType.toLowerCase();
    const matchesLocation = location === 'All' || job.location_type === location.toLowerCase();
    const matchesExp = experience === 'All' || job.experience_level === experience.toLowerCase();
    return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesExp;
  });

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#F5F3ED]">Find Your Next Opportunity</h1>
          <p className="mt-2 text-[#A8A6B8]">Discover premium roles in Web2 and Web3.</p>
        </div>

        {/* Filters */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5C5A70]" />
            <input 
              type="text"
              placeholder="Search by job title or company..."
              className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A8A6B8] uppercase tracking-wider">Category</label>
              <div className="flex bg-[#0F0F1A] p-1 rounded-lg border border-[#3A3A52]">
                {['All', 'Web2', 'Web3'].map(opt => (
                  <button 
                    key={opt}
                    onClick={() => setCategory(opt)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-all ${category === opt ? 'bg-[#3A3A52] text-[#F5F3ED]' : 'text-[#5C5A70] hover:text-[#A8A6B8]'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-[#A8A6B8] uppercase tracking-wider">Job Type</label>
              <select 
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] rounded-lg px-4 py-2 appearance-none focus:outline-none focus:border-[#C9A84C]"
                value={jobType} onChange={(e) => setJobType(e.target.value)}
              >
                {['All', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-[#A8A6B8] uppercase tracking-wider">Location</label>
              <select 
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] rounded-lg px-4 py-2 appearance-none focus:outline-none focus:border-[#C9A84C]"
                value={location} onChange={(e) => setLocation(e.target.value)}
              >
                {['All', 'Remote', 'Hybrid', 'Onsite'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-[#A8A6B8] uppercase tracking-wider">Experience</label>
              <select 
                className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] rounded-lg px-4 py-2 appearance-none focus:outline-none focus:border-[#C9A84C]"
                value={experience} onChange={(e) => setExperience(e.target.value)}
              >
                {['All', 'Entry', 'Mid', 'Senior', 'Lead'].map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52]">
              <Search className="h-12 w-12 text-[#5C5A70] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#F5F3ED]">No jobs found</h3>
              <p className="text-[#A8A6B8] mt-2">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map((job) => (
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
                            onClick={(e) => toggleBookmark(job.id, e)}
                            className="p-2.5 rounded-xl border border-[#3A3A52] hover:bg-[#0F0F1A] hover:border-[#C9A84C] hover:text-[#C9A84C] text-[#5C5A70] transition-colors"
                          >
                            {bookmarkedJobs.has(job.id) ? <BookmarkCheck className="h-5 w-5 text-[#C9A84C]" /> : <Bookmark className="h-5 w-5" />}
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setApplyingJob(job); }}
                            className="bg-[#C9A84C] hover:bg-[#b09342] text-[#0A0A0F] font-semibold py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(201,168,76,0.3)] hover:shadow-[0_0_25px_rgba(201,168,76,0.5)] active:scale-95"
                          >
                            Apply
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

      {/* Apply Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setApplyingJob(null)}
              className="absolute top-4 right-4 p-1 text-[#5C5A70] hover:text-[#F5F3ED] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-[#F5F3ED] mb-1">Apply for {applyingJob.title}</h2>
            <p className="text-[#A8A6B8] text-sm mb-6">at {applyingJob.company_name}</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#F5F3ED]">Cover Letter (Optional)</label>
                <textarea 
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Introduce yourself and explain why you're a great fit..."
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] rounded-xl p-3 focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#F5F3ED]">Resume (Optional)</label>
                <div className="border-2 border-dashed border-[#3A3A52] rounded-xl p-6 text-center hover:border-[#C9A84C] transition-colors bg-[#0F0F1A] relative cursor-pointer">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResumeFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="h-8 w-8 text-[#5C5A70] mx-auto mb-2" />
                  <p className="text-sm text-[#A8A6B8]">
                    {resumeFile ? resumeFile.name : 'Click or drag file to upload'}
                  </p>
                  <p className="text-xs text-[#5C5A70] mt-1">PDF, DOC up to 5MB</p>
                </div>
              </div>
              
              <button 
                onClick={submitApplication}
                disabled={isSubmitting}
                className="w-full bg-[#C9A84C] hover:bg-[#b09342] text-[#0A0A0F] font-semibold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(201,168,76,0.3)] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
