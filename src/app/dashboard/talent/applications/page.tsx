'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardShell from '@/components/DashboardShell';
import { Briefcase, Loader2, Calendar, Building, ChevronRight, Inbox } from 'lucide-react';
import Link from 'next/link';

export default function MyApplicationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Pending', 'Reviewed', 'Shortlisted', 'Hired', 'Rejected'];

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
          
          const res = await fetch(`/api/jobs/applications?applicantId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setApplications(data);
          } else {
            setApplications([
              { id: '1', job_id: '1', job_title: 'Senior Frontend Engineer', company_name: 'TechCorp', applied_date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'reviewed' },
              { id: '2', job_id: '2', job_title: 'Smart Contract Developer', company_name: 'DeFi Protocol', applied_date: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'pending' },
              { id: '3', job_id: '3', job_title: 'Product Designer', company_name: 'CreativeDAO', applied_date: new Date(Date.now() - 86400000 * 15).toISOString(), status: 'shortlisted' }
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

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
      case 'reviewed': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'shortlisted': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'hired': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/10 border-red-400/20 text-red-400';
      default: return 'bg-[#3A3A52] border-[#5C5A70] text-[#A8A6B8]';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
  };

  const filteredApps = applications.filter(app => activeTab === 'All' || app.status.toLowerCase() === activeTab.toLowerCase());

  return (
    <DashboardShell role="talent" fullName={profile?.full_name} username={profile?.username}>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#F5F3ED]">My Applications</h1>
          <p className="mt-2 text-[#A8A6B8]">Track your job application status.</p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar border-b border-[#3A3A52]">
          <div className="flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === tab ? 'text-[#C9A84C]' : 'text-[#A8A6B8] hover:text-[#F5F3ED]'}`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A84C] rounded-t-full shadow-[0_0_10px_rgba(201,168,76,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-20 bg-[#1A1A2E] rounded-2xl border border-[#3A3A52]">
              <Inbox className="h-12 w-12 text-[#5C5A70] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#F5F3ED]">No applications found</h3>
              <p className="text-[#A8A6B8] mt-2">
                {activeTab === 'All' ? "You haven't applied to any jobs yet." : `No applications in '${activeTab}' status.`}
              </p>
              {activeTab === 'All' && (
                <Link href="/dashboard/talent" className="inline-block mt-6 px-6 py-2 bg-[#C9A84C] text-[#0A0A0F] font-semibold rounded-lg hover:bg-[#b09342] transition-colors">
                  Browse Jobs
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => (
                <Link key={app.id} href={`/dashboard/talent/job/${app.job_id}`} className="block group">
                  <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:border-[#C9A84C]/50 hover:bg-[#1A1A2E]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-[#F5F3ED] group-hover:text-[#C9A84C] transition-colors flex items-center gap-2">
                        {app.job_title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[#A8A6B8]">
                        <span className="flex items-center gap-1.5"><Building className="h-4 w-4 text-[#5C5A70]" /> {app.company_name}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#5C5A70]" /> Applied {formatDate(app.applied_date)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#3A3A52]">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                      <ChevronRight className="h-5 w-5 text-[#5C5A70] group-hover:text-[#C9A84C] transition-transform group-hover:translate-x-1" />
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
