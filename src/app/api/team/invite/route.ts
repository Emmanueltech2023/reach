import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { projectId, username, role, invitedBy } = await req.json();

    if (!projectId || !username || !role || !invitedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find user by username (case-insensitive)
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, kyc_status")
      .ilike("username", username.replace("@", ""))
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User not found. Check the username and try again." },
        { status: 404 }
      );
    }

    // Check not already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", targetUser.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This user is already a team member." },
        { status: 400 }
      );
    }

    // Add team member
    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        project_id: projectId,
        user_id: targetUser.id,
        role,
        invited_by: invitedBy,
      });

    if (insertError) {
      console.log("Team insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to add team member." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: targetUser.id, full_name: targetUser.full_name },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}