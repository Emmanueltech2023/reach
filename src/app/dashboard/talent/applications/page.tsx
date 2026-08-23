'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { Briefcase, Loader2, Calendar, Building, ChevronRight, Inbox, Clock, CheckCircle2, XCircle, Sparkles, Eye, Zap, Shield } from 'lucide-react';
import Link from 'next/link';

export default function MyApplicationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Pending', 'Reviewed', 'Shortlisted', 'Hired', 'Rejected'];

  const isProTalent = (profile?.subscription_tier || '').toLowerCase() === 'pro' || (profile?.subscription_tier || '').toLowerCase() === 'premium';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role, full_name, username, subscription_tier, is_verified')
            .eq('id', user.id)
            .single();
          setProfile(profileData);
          
          const res = await fetch(`/api/jobs/applications?applicantId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setApplications(data || []);
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

  const getStatusBadge = (status: string) => {
    const st = (status || 'pending').toLowerCase();
    switch(st) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            <Clock className="h-3 w-3" /> Under Review
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Sparkles className="h-3 w-3" /> Reviewed
          </span>
        );
      case 'shortlisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="h-3 w-3" /> Shortlisted
          </span>
        );
      case 'hired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-500/20 border border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
            <CheckCircle2 className="h-3 w-3" /> Offer Extended
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400">
            <XCircle className="h-3 w-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#2A2A3E] border border-[#3A3A52] text-[#A8A6B8]">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
  };

  const filteredApps = applications.filter(app => {
    if (activeTab === 'All') return true;
    return app.status?.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F3ED]">Application Tracker</h1>
            <p className="text-xs sm:text-sm text-[#A8A6B8] mt-1">Real-time status updates on all positions you've submitted.</p>
          </div>
          <Link
            href="/dashboard/talent"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs shadow-md shadow-[#C9A84C]/20 hover:bg-[#D4B55D] transition-all"
          >
            Find New Opportunities
          </Link>
        </div>

        {/* Tabs Scroller */}
        <div className="flex overflow-x-auto pb-1 border-b border-[#3A3A52] scrollbar-none gap-2">
          {tabs.map(tab => {
            const count = tab === 'All' 
              ? applications.length 
              : applications.filter(a => a.status?.toLowerCase() === tab.toLowerCase()).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                  activeTab === tab ? 'text-[#C9A84C]' : 'text-[#A8A6B8] hover:text-[#F5F3ED]'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-[#1A1A2E] text-[#5C5A70]'
                }`}>
                  {count}
                </span>
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A84C] rounded-t-full shadow-[0_0_10px_rgba(201,168,76,0.5)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Pro Talent Read Receipts Banner / Teaser */}
        {!isProTalent && applications.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C9A84C15] to-[#1A1A2E] border border-[#C9A84C35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C9A84C20] border border-[#C9A84C40] flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#F5F3ED]">
                  Want real-time application read receipts?
                </p>
                <p className="text-[11px] text-[#A8A6B8] mt-0.5">
                  Pro Talent members see when recruiters open their cover letter, view their CV, and short-list them.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/upgrade"
              className="px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs hover:bg-[#D4B55D] transition-all shrink-0 shadow-md shadow-[#C9A84C]/20"
            >
              Upgrade to Pro ($5/mo)
            </Link>
          </div>
        )}

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20 bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0F] flex items-center justify-center mx-auto text-[#5C5A70]">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3ED]">No applications in this category</h3>
              <p className="text-xs text-[#A8A6B8] max-w-sm mx-auto">
                {activeTab === 'All' ? "You haven't applied to any job listings yet." : `No submissions are currently '${activeTab}'.`}
              </p>
              {activeTab === 'All' && (
                <Link 
                  href="/dashboard/talent" 
                  className="inline-block mt-2 px-5 py-2.5 bg-[#C9A84C] text-[#0A0A0F] font-bold text-xs rounded-xl hover:bg-[#D4B55D] transition-all shadow-md shadow-[#C9A84C]/20"
                >
                  Browse Open Positions
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredApps.map((app) => {
                const jobTitle = app.job_title || app.jobs?.title || 'Position';
                const compName = app.company_name || app.jobs?.company_name || 'Employer';
                const compLogo = app.jobs?.company_logo_url;
                const jobId = app.job_id || app.jobs?.id;
                const isViewed = app.status?.toLowerCase() === 'reviewed' || app.status?.toLowerCase() === 'shortlisted' || app.status?.toLowerCase() === 'hired';

                return (
                  <Link key={app.id} href={`/dashboard/talent/job/${jobId}`} className="block group">
                    <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[#C9A84C]/60 hover:shadow-xl hover:shadow-[#C9A84C]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#0A0A0F] border border-[#3A3A52] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                          {compLogo ? (
                            <img src={compLogo} alt={compName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          ) : (
                            <span className="text-sm font-extrabold text-[#C9A84C]">
                              {compName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h3 className="text-base font-bold text-[#F5F3ED] group-hover:text-[#C9A84C] transition-colors truncate">
                            {jobTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#A8A6B8]">
                            <span className="font-semibold text-[#F5F3ED]">{compName}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#5C5A70]">
                              <Calendar className="h-3 w-3" /> Submitted {formatDate(app.applied_date || app.created_at)}
                            </span>
                            {/* Read receipt indicator for Pro Talent */}
                            {isProTalent && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isViewed ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-[#A8A6B8] bg-[#0A0A0F] border border-[#3A3A52]'
                              }`}>
                                <Eye className="h-2.5 w-2.5" />
                                {isViewed ? 'Read by Recruiter' : 'Delivered'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#3A3A52]/60 shrink-0">
                        {getStatusBadge(app.status)}
                        <ChevronRight className="h-4 w-4 text-[#5C5A70] group-hover:text-[#C9A84C] transition-transform group-hover:translate-x-1" />
                      </div>

                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
