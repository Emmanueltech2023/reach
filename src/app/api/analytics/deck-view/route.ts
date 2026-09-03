import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { projectId, documentTitle, viewerName, founderId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ message: "No project id provided" }, { status: 200 });
    }

    // Try to find founder if founderId was not directly passed
    let targetFounderId = founderId;
    let projectName = "your startup";

    if (!targetFounderId) {
      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, name, founder_id")
        .eq("id", projectId)
        .maybeSingle();

      if (project) {
        targetFounderId = project.founder_id;
        projectName = project.name;
      }
    }

    // Log the view in project_views
    try {
      await supabaseAdmin.from("project_views").insert({
        project_id: projectId,
        viewed_at: new Date().toISOString(),
      });
    } catch {}

    // Dispatch a real-time notification to the founder
    if (targetFounderId) {
      const viewerLabel = viewerName && viewerName !== "REACH Member" ? viewerName : "An Investor";
      try {
        await supabaseAdmin.from("notifications").insert({
          user_id: targetFounderId,
          type: "deck_view",
          title: "Pitch Deck Inspected 👁️",
          message: `${viewerLabel} just reviewed your confidential ${documentTitle || "Pitch Deck"} in the Verified Deal Room.`,
          action_url: `/dashboard/builder/analytics/${projectId}`,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn("Notification insert notice:", notifErr);
      }
    }

    return NextResponse.json({ success: true, logged: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deck view logging error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
