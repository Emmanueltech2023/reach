import { adminSupabase } from "@/lib/auth-server";
import { NextRequest } from "next/server";

export interface LogActivityParams {
  req?: NextRequest;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  actionType: string;
  targetId?: string | null;
  targetType?: string | null;
  description: string;
  details?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (params.req) {
      ipAddress =
        params.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        params.req.headers.get("x-real-ip") ||
        "127.0.0.1";
      userAgent = params.req.headers.get("user-agent") || null;
    }

    let actorName = params.actorName;
    let actorEmail = params.actorEmail;
    let actorRole = params.actorRole;

    // If actorId provided but missing profile details, fetch profile
    if (params.actorId && (!actorName || !actorRole)) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("full_name, role, username")
        .eq("id", params.actorId)
        .maybeSingle();

      if (profile) {
        actorName = actorName || profile.full_name || profile.username;
        actorRole = actorRole || profile.role;
      }
    }

    await adminSupabase.from("activity_logs").insert({
      actor_id: params.actorId || null,
      actor_name: actorName || "Anonymous User",
      actor_email: actorEmail || null,
      actor_role: actorRole || "user",
      action_type: params.actionType,
      target_id: params.targetId || null,
      target_type: params.targetType || null,
      description: params.description,
      details: params.details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("⚠️ Failed to record activity log:", err);
  }
}
