"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import {
  Calendar, Clock, Video, Phone,
  CheckCircle, Loader2, Plus, Users,
} from "lucide-react"; // Removed unused MapPin and ChevronRight
import { createClient } from "@/lib/supabase/client";

type Meeting = {
  id: string;
  title: string;
  agenda: string | null;
  scheduled_at: string;
  timezone: string;
  status: string;
  meeting_url: string | null;
  organizer_id: string;
  profiles: {
    full_name: string;
    username: string;
    is_verified: boolean;
  };
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) > new Date();
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
  confirmed: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
  cancelled: "bg-red-900/30 text-red-400 border-red-800",
  completed: "bg-[#1A1A2E] text-[#5C5A70] border-[#3A3A52]",
};

export default function MeetingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string;
    username: string;
    role: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Wrapped in useCallback to prevent infinite render cycles and fix dependencies
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, username, role")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof);

    // Get meetings where user is a participant
    const { data: participations } = await supabase
      .from("meeting_participants")
      .select("meeting_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    const meetingIds = participations.map((p) => p.meeting_id);

    const { data: meetingsData } = await supabase
      .from("meetings")
      .select(`
        *,
        profiles(full_name, username, is_verified)
      `)
      .in("id", meetingIds)
      .order("scheduled_at", { ascending: true });

    setMeetings(meetingsData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await fetchData();
    };

    if (isMounted) {
      void loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    await supabase
      .from("meetings")
      .update({ status })
      .eq("id", meetingId);
    await fetchData();
  };

  const upcoming = meetings.filter((m) => isUpcoming(m.scheduled_at) && m.status !== "cancelled");
  const past = meetings.filter((m) => !isUpcoming(m.scheduled_at) || m.status === "cancelled");
  const displayed = activeTab === "upcoming" ? upcoming : past;

  return (
    <DashboardShell
      role={profile?.role as "investor" | "builder" || "investor"}
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F5F3ED] text-lg font-medium">Meetings</h1>
            <p className="text-[#5C5A70] text-xs mt-0.5">
              {upcoming.length} upcoming
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/chats")}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            <Plus size={15} />
            Schedule
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A2E] border border-[#3A3A52] rounded-lg p-1">
          {(["upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm rounded-md transition font-medium ${
                activeTab === tab
                  ? "bg-[#C9A84C] text-[#1A1A2E]"
                  : "text-[#5C5A70] hover:text-[#A8A6B8]"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">
                ({tab === "upcoming" ? upcoming.length : past.length})
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <Calendar size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">
              {activeTab === "upcoming"
                ? "No upcoming meetings"
                : "No past meetings"}
            </p>
            {activeTab === "upcoming" && (
              <p className="text-[#5C5A70] text-xs text-center max-w-xs">
                Schedule a meeting from any chat conversation using the Meeting button
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((meeting) => {
              const isOrganizer = meeting.organizer_id === currentUserId;
              const statusStyle = STATUS_STYLES[meeting.status] || STATUS_STYLES.pending;
              const isMeetingUpcoming = isUpcoming(meeting.scheduled_at);

              return (
                <div
                  key={meeting.id}
                  className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-[#F5F3ED] text-sm font-medium mb-1">
                        {meeting.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        <CheckCircle size={11} className={
                          meeting.profiles?.is_verified ? "text-emerald-400" : "text-[#3A3A52]"
                        } />
                        <span className="text-[#5C5A70] text-xs">
                          {isOrganizer ? "You organized" : `By ${meeting.profiles?.full_name}`}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${statusStyle}`}>
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </span>
                  </div>

                  {/* Date + time */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                      <Calendar size={13} className="text-[#5C5A70]" />
                      {formatDate(meeting.scheduled_at)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                      <Clock size={13} className="text-[#5C5A70]" />
                      {formatTime(meeting.scheduled_at)} · {meeting.timezone}
                    </div>
                    {meeting.agenda && (
                      <div className="flex items-start gap-2 text-xs text-[#A8A6B8]">
                        <Users size={13} className="text-[#5C5A70] shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{meeting.agenda}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isMeetingUpcoming && meeting.status !== "cancelled" && (
                    <div className="flex gap-2">
                      {meeting.meeting_url ? (
                        <a href={meeting.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition"
                        >
                          <Video size={13} />
                          Join meeting
                        </a>
                      ) : (
                        <button
                          onClick={() => router.push("/dashboard/chats")}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#C9A84C] text-[#1A1A2E] text-xs font-medium py-2 rounded-lg hover:opacity-90 transition"
                        >
                          <Phone size={13} />
                          Start call in chat
                        </button>
                      )}
                      {meeting.status === "pending" && !isOrganizer && (
                        <button
                          onClick={() => updateMeetingStatus(meeting.id, "confirmed")}
                          className="flex items-center justify-center gap-1.5 border border-emerald-700 text-emerald-400 text-xs py-2 px-3 rounded-lg hover:bg-emerald-900/20 transition"
                        >
                          Confirm
                        </button>
                      )}
                      {isOrganizer && (
                        <button
                          onClick={() => updateMeetingStatus(meeting.id, "cancelled")}
                          className="flex items-center justify-center gap-1.5 border border-red-800 text-red-400 text-xs py-2 px-3 rounded-lg hover:bg-red-900/20 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {meeting.status === "completed" && (
                    <div className="text-xs text-[#5C5A70] text-center py-1">
                      Meeting completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}