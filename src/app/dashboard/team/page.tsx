"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import {
  Users,
  Plus,
  X,
  CheckCircle,
  Loader2,
  Crown,
  Eye,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  logo_url: string | null;
};

type TeamMember = {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    kyc_status: string;
  };
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "text-[#C9A84C]" },
  collaborator: { label: "Collaborator", color: "text-emerald-400" },
  chat_participant: { label: "Chat only", color: "text-blue-400" },
  viewer: { label: "Viewer", color: "text-[#A8A6B8]" },
};

export default function TeamPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    username: string;
    role: string;
  } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("collaborator");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchMembers = useCallback(async (projectId: string) => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        *,
        profiles!user_id(id, full_name, username, avatar_url, is_verified, kyc_status)
      `)
      .eq("project_id", projectId)
      .order("joined_at", { ascending: true });

    console.log("Raw fetched data:", data);

    if (error) {
      console.error("Supabase fetch error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    setMembers(data || []);
    setLoadingMembers(false);
  }, [supabase]);

  useEffect(() => {
    const loadTeamData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, username, role")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      const { data: projs } = await supabase
        .from("projects")
        .select("id, name, logo_url")
        .eq("founder_id", user.id)
        .order("created_at", { ascending: false });

      setProjects(projs || []);

      if (projs && projs.length > 0) {
        setSelectedProject(projs[0]);
        await fetchMembers(projs[0].id);
      }

      setLoading(false);
    };

    void loadTeamData();
  }, [fetchMembers, supabase]);

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !selectedProject || !profile) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProject.id,
        username: inviteUsername.trim(),
        role: inviteRole,
        invitedBy: profile.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteError(data.error || "Failed to add team member.");
      setInviting(false);
      return;
    }

    // 1. Instantly inject the new member into local state so they show up on screen immediately
    if (data.user) {
      const newMember: TeamMember = {
        id: Math.random().toString(), // Temporary client UI ID
        role: inviteRole,
        joined_at: new Date().toISOString(),
        user_id: data.user.id,
        profiles: {
          id: data.user.id,
          full_name: data.user.full_name,
          username: inviteUsername.trim().replace("@", ""),
          avatar_url: null, // Will populate properly on next full refresh
          is_verified: false,
          kyc_status: "pending",
        },
      };

      setMembers((prev) => [...prev, newMember]);
    }

    setInviteSuccess(true);
    setInviteUsername("");
    setInviting(false);

    // 2. Fire and forget the notification request in the background
    fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.user.id,
        title: "Team invitation",
        body: `${profile.full_name} added you to the ${selectedProject.name} team as ${inviteRole}.`,
        type: "general",
        actionUrl: "/dashboard/chats",
      }),
    }).catch((err) => console.error("Notification failed to send:", err));

    // 3. Clear the success banner after 3 seconds
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (userId === profile?.id) return;

    const res = await fetch("/api/team/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    const res = await fetch("/api/team/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: newRole }),
    });

    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );
    }
  };

  return (
    <DashboardShell
      role="builder"
      fullName={profile?.full_name}
      username={profile?.username}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F5F3ED] text-lg font-medium">Team</h1>
            <p className="text-[#5C5A70] text-xs mt-0.5">
              Manage your project collaborators
            </p>
          </div>
          {selectedProject && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              <Plus size={15} />
              Invite
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-[#3A3A52] rounded-xl">
            <Users size={28} className="text-[#3A3A52]" />
            <p className="text-[#5C5A70] text-sm">No projects yet</p>
            <button
              onClick={() => router.push("/dashboard/builder/upload")}
              className="text-[#C9A84C] text-xs underline underline-offset-2"
            >
              Upload a project first
            </button>
          </div>
        ) : (
          <>
            {/* Project selector */}
            {projects.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProject(p);
                      fetchMembers(p.id);
                    }}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                      selectedProject?.id === p.id
                        ? "border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]"
                        : "border-[#3A3A52] text-[#A8A6B8] hover:border-[#5C5A70]"
                    }`}
                  >
                    {p.logo_url ? (
                      <div className="relative w-5 h-5 rounded overflow-hidden">
                        <Image
                          src={p.logo_url}
                          alt={p.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#C9A84C20] flex items-center justify-center">
                        <span className="text-xs text-[#C9A84C]">
                          {p.name[0]}
                        </span>
                      </div>
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Team members */}
            {loadingMembers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="text-[#C9A84C] animate-spin" />
              </div>
            ) : (
              <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#3A3A52]">
                  <span className="text-xs font-medium text-[#A8A6B8] uppercase tracking-wider">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {members.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[#5C5A70] text-sm">
                      No team members yet
                    </p>
                    <p className="text-[#5C5A70] text-xs mt-1">
                      Click Invite to add your first collaborator
                    </p>
                  </div>
                ) : (
                  members.map((member, index) => {
                    const isOwner = member.role === "owner";
                    const isMe = member.user_id === profile?.id;
                    const roleConfig =
                      ROLE_LABELS[member.role] || ROLE_LABELS.viewer;

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          index < members.length - 1
                            ? "border-b border-[#3A3A52]"
                            : ""
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative w-9 h-9 rounded-full bg-[#C9A84C20] flex items-center justify-center text-xs font-medium text-[#C9A84C] shrink-0 overflow-hidden">
                          {member.profiles?.avatar_url ? (
                            <Image
                              src={member.profiles.avatar_url}
                              alt={member.profiles?.full_name || "Team member avatar"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            member.profiles?.full_name?.[0] || "?"
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#F5F3ED] text-sm font-medium truncate">
                              {member.profiles?.full_name}
                            </span>
                            {member.profiles?.is_verified && (
                              <CheckCircle
                                size={12}
                                className="text-emerald-400 shrink-0"
                              />
                            )}
                            {isOwner && (
                              <Crown
                                size={12}
                                className="text-[#C9A84C] shrink-0"
                              />
                            )}
                            {isMe && (
                              <span className="text-xs text-[#5C5A70]">
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#5C5A70] text-xs">
                              @{member.profiles?.username}
                            </span>
                            <span
                              className={`text-xs font-medium ${roleConfig.color}`}
                            >
                              · {roleConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isOwner && !isMe && (
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) =>
                                updateRole(member.id, e.target.value)
                              }
                              className="text-xs bg-[#0F0F1A] border border-[#3A3A52] text-[#A8A6B8] rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="collaborator">Collaborator</option>
                              <option value="chat_participant">
                                Chat only
                              </option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={() =>
                                removeMember(member.id, member.user_id)
                              }
                              className="w-7 h-7 flex items-center justify-center text-[#5C5A70] hover:text-red-400 transition"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Role guide */}
            <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-xl p-4">
              <h3 className="text-[#F5F3ED] text-sm font-medium mb-3">
                Role permissions
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  {
                    role: "Owner",
                    icon: Crown,
                    desc: "Full control — only the founder",
                    color: "text-[#C9A84C]",
                  },
                  {
                    role: "Collaborator",
                    icon: Users,
                    desc: "Can chat, join meetings and edit project details",
                    color: "text-emerald-400",
                  },
                  {
                    role: "Chat only",
                    icon: MessageCircle,
                    desc: "Can send and receive messages only",
                    color: "text-blue-400",
                  },
                  {
                    role: "Viewer",
                    icon: Eye,
                    desc: "Read-only access to project and chats",
                    color: "text-[#A8A6B8]",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.role} className="flex items-center gap-3">
                      <Icon size={14} className={`${item.color} shrink-0`} />
                      <span
                        className={`text-xs font-medium ${item.color} w-24 shrink-0`}
                      >
                        {item.role}
                      </span>
                      <span className="text-[#5C5A70] text-xs">
                        {item.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="bg-[#1A1A2E] border border-[#3A3A52] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#F5F3ED] text-base font-medium">
                Invite team member
              </h3>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteError(null);
                  setInviteSuccess(false);
                  setInviteUsername("");
                }}
              >
                <X size={18} className="text-[#5C5A70]" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                  Username
                </label>
                <input
                  value={inviteUsername}
                  onChange={(e) => {
                    setInviteUsername(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="@username"
                  className="w-full bg-[#0F0F1A] border border-[#3A3A52] text-[#F5F3ED] text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#C9A84C] transition placeholder-[#5C5A70]"
                />
              </div>

              <div>
                <label className="text-[#A8A6B8] text-xs mb-1.5 block">
                  Role
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      id: "collaborator",
                      label: "Collaborator",
                      desc: "Chat, meetings, edit project",
                    },
                    {
                      id: "chat_participant",
                      label: "Chat only",
                      desc: "Messages and meetings only",
                    },
                    { id: "viewer", label: "Viewer", desc: "Read-only access" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setInviteRole(r.id)}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition ${
                        inviteRole === r.id
                          ? "border-[#C9A84C] bg-[#C9A84C10]"
                          : "border-[#3A3A52] hover:border-[#5C5A70]"
                      }`}
                    >
                      <div className="flex-1">
                        <div
                          className={`text-sm font-medium ${
                            inviteRole === r.id
                              ? "text-[#C9A84C]"
                              : "text-[#F5F3ED]"
                          }`}
                        >
                          {r.label}
                        </div>
                        <div className="text-xs text-[#5C5A70] mt-0.5">
                          {r.desc}
                        </div>
                      </div>
                      {inviteRole === r.id && (
                        <div className="w-4 h-4 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0 mt-0.5">
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <path
                              d="M2 5l2.5 2.5L8 3"
                              stroke="#1A1A2E"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 text-xs rounded-lg px-3 py-2">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs rounded-lg px-3 py-2">
                  Team member added successfully!
                </div>
              )}

              <button
                onClick={handleInvite}
                disabled={!inviteUsername.trim() || inviting}
                className={`w-full font-medium text-sm py-3 rounded-lg transition ${
                  inviteUsername.trim() && !inviting
                    ? "bg-[#C9A84C] text-[#1A1A2E] hover:opacity-90"
                    : "bg-[#2A2A3E] text-[#5C5A70] cursor-not-allowed"
                }`}
              >
                {inviting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Adding…
                  </span>
                ) : (
                  "Add to team"
                )}
              </button>

              <p className="text-[#5C5A70] text-xs text-center">
                User must be registered on iVest
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
