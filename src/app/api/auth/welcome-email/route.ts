import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, name, userId, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
    }

    const userName = name || "Member";
    const htmlContent = emailTemplates.welcome(userName);

    // 1. Send Brevo welcome email
    const result = await sendEmail({
      to: email,
      subject: `Welcome to REACH, ${userName}! 🚀`,
      html: htmlContent,
    });

    // 2. Insert in-app Welcome Notification for the user
    if (userId) {
      const userRole = role || "member";
      const welcomeBody = userRole === "investor"
        ? "Welcome to REACH! Explore top verified projects, match with AI-recommended startups, and start connecting with founders."
        : userRole === "builder"
        ? "Welcome to REACH! Upload your project workspace, showcase your pitch deck, and start reaching global investors."
        : userRole === "talent"
        ? "Welcome to REACH! Browse Web2 & Web3 career opportunities, apply to top startups, and build your professional network."
        : "Welcome to REACH! Your account is active. Complete your profile to get started.";

      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: userId,
        title: `Welcome to REACH, ${userName}! 🚀`,
        body: welcomeBody,
        type: "general",
        action_url: "/dashboard/profile",
      });
      if (notifErr) console.warn("In-app welcome notification insert warning:", notifErr);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send Brevo welcome email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Welcome email endpoint error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
