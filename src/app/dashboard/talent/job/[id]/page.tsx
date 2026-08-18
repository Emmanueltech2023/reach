'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { ArrowLeft, MapPin, Briefcase, Clock, Bookmark, BookmarkCheck, DollarSign, Star, Loader2, X, Upload, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCurrency } from '@/components/CurrencyProvider';

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const supabase = useMemo(() => createClient(), []);
  const { formatCurrency } = useCurrency();

  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
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
          
          const { data: bookmark } = await supabase
            .from('job_bookmarks')
            .select('*')
            .eq('user_id', user.id)
            .eq('job_id', id)
            .single();
          if (bookmark) setIsBookmarked(true);
        }
        
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        } else {
          setJob({
            id, title: 'Senior Frontend Engineer', company_name: 'TechCorp', category: 'web2',
            location_type: 'remote', job_type: 'full-time', experience_level: 'senior',
            salary_min: 120000, salary_max: 150000, skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux'],
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(), is_featured: true, company_logo: 'TC',
            description: "We are looking for an experienced Senior Frontend Engineer to lead the development of our next-generation web platform.\n\nYou will work closely with our design and product teams to create beautiful, performant, and accessible user interfaces.\n\n**Responsibilities:**\n- Architect and implement robust frontend solutions using React and Next.js.\n- Optimize applications for maximum speed and scalability.\n- Mentor junior developers and establish best practices.\n- Collaborate with backend engineers to define API requirements.\n\n**Requirements:**\n- 5+ years of experience in frontend development.\n- Deep understanding of React, TypeScript, and modern state management.\n- Experience with performance tuning and web vitals.\n- Strong communication skills and a product-focused mindset.",
            poster: { name: 'Sarah Connor', verified: true }
          });
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

  const submitApplication = async () => {
    if (!job) return;
    setIsSubmitting(true);
    try {
      let resumeUrl = '';
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        formData.append('bucket', 'resumes');
        const uploadRes = await fetch('/api/upload/image', { method: 'POST', body: formData });
        if (uploadRes.ok) resumeUrl = (await uploadRes.json()).url;
      }

      await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, applicantId: userId, coverLetter, resumeUrl })
      });
      setShowApplyModal(false);
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
        <div className="text-center py-20 text-[#A8A6B8]">Job not found.</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
        
        <Link href="/dashboard/talent" className="inline-flex items-center text-sm text-[#A8A6B8] hover:text-[#C9A84C] transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
        </Link>

        {/* Job Header Card */}
        <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          {job.is_featured && (
            <div className="absolute -top-20 -right-20 bg-gradient-to-bl from-[#C9A84C]/30 to-transparent w-64 h-64 blur-3xl rounded-full pointer-events-none" />
          )}
          
          <div className="flex flex-col md:flex-row md:items-start gap-8 relative z-10">
            <div className="h-24 w-24 bg-[#0F0F1A] border border-[#3A3A52] rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
              {job.company_logo && job.company_logo.length <= 2 ? (
                <span className="text-3xl font-bold text-[#A8A6B8]">{job.company_logo}</span>
              ) : (
                <span className="text-3xl font-bold text-[#A8A6B8]">{job.company_name?.charAt(0)}</span>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-[#F5F3ED]">{job.title}</h1>
                  {job.is_featured && (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-[#C9A84C]/10 text-[#C9A84C] px-3 py-1 rounded-full border border-[#C9A84C]/20">
                      <Star className="h-4 w-4 fill-current" /> Featured
                    </span>
                  )}
                </div>
                <p className="text-lg text-[#A8A6B8]">{job.company_name}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-[#A8A6B8]">
                <div className="flex items-center gap-2 bg-[#0F0F1A] border border-[#3A3A52] px-3 py-1.5 rounded-lg">
                  <MapPin className="h-4 w-4 text-[#C9A84C]" /> <span className="text-sm capitalize">{job.location_type}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#0F0F1A] border border-[#3A3A52] px-3 py-1.5 rounded-lg">
                  <Briefcase className="h-4 w-4 text-[#C9A84C]" /> <span className="text-sm capitalize">{job.job_type}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#0F0F1A] border border-[#3A3A52] px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-[#C9A84C]" /> <span className="text-sm capitalize">{job.experience_level}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#0F0F1A] border border-[#3A3A52] px-3 py-1.5 rounded-lg">
                  <DollarSign className="h-4 w-4 text-[#C9A84C]" /> <span className="text-sm">{formatSalary(job.salary_min, job.salary_max)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-row md:flex-col gap-3 shrink-0">
              <button 
                onClick={() => setShowApplyModal(true)}
                className="bg-[#C9A84C] hover:bg-[#b09342] text-[#0A0A0F] font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)] active:scale-95 flex-1 md:flex-none text-center"
              >
                Apply Now
              </button>
              <button 
                onClick={toggleBookmark}
                className="p-3 rounded-xl border border-[#3A3A52] hover:bg-[#0F0F1A] hover:border-[#C9A84C] hover:text-[#C9A84C] text-[#A8A6B8] transition-colors flex items-center justify-center"
              >
                {isBookmarked ? <BookmarkCheck className="h-6 w-6 text-[#C9A84C]" /> : <Bookmark className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-8">
              <h2 className="text-xl font-bold text-[#F5F3ED] mb-6 border-b border-[#3A3A52] pb-4">Job Description</h2>
              <div className="prose prose-invert max-w-none text-[#A8A6B8] whitespace-pre-line leading-relaxed">
                {job.description}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#F5F3ED] uppercase tracking-wider mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills?.map((skill: string) => (
                  <span key={skill} className="text-sm bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] px-3 py-1.5 rounded-lg">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#F5F3ED] uppercase tracking-wider mb-4">About the Poster</h3>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#0F0F1A] border border-[#3A3A52] rounded-full flex items-center justify-center">
                  <span className="text-[#A8A6B8] font-bold">{job.poster?.name?.charAt(0) || 'U'}</span>
                </div>
                <div>
                  <p className="font-medium text-[#F5F3ED] flex items-center gap-1.5">
                    {job.poster?.name || 'Unknown'} 
                    {job.poster?.verified && <ShieldCheck className="h-4 w-4 text-[#C9A84C]" />}
                  </p>
                  <p className="text-xs text-[#5C5A70] mt-1">Hiring Manager</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#F5F3ED] uppercase tracking-wider mb-4">Job Overview</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex justify-between">
                  <span className="text-[#5C5A70]">Posted</span>
                  <span className="text-[#F5F3ED] font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#5C5A70]">Category</span>
                  <span className="text-[#F5F3ED] font-medium capitalize">{job.category === 'web3' ? 'Web3' : 'Web2'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 p-1 text-[#5C5A70] hover:text-[#F5F3ED] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-[#F5F3ED] mb-1">Apply for {job.title}</h2>
            <p className="text-[#A8A6B8] text-sm mb-6">at {job.company_name}</p>
            
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
