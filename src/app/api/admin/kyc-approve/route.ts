import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization: Essential to re-add
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { data: { user: admin } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", admin?.id).single();
    if (adminProfile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Input validation
    const { userId, action } = await req.json();
    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 3. Fetch data in parallel
    const [profileRes, authRes] = await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", userId).single(),
      supabase.auth.admin.getUserById(userId)
    ]);

    const { full_name, role } = profileRes.data || {};
    const email = authRes.data.user?.email;

    // 4. Atomic Database Updates
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kyc_status: action === "approve" ? "approved" : "rejected",
        is_verified: action === "approve",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    const dashUrl = role === "builder" ? "/dashboard/builder" : role === "talent" ? "/dashboard/talent" : "/dashboard/investor";

    // 5. Secondary tasks: Fire-and-forget (do not await critical path)
    const notification = supabase.from("notifications").insert({
      user_id: userId,
      title: action === "approve" ? "KYC Approved ✓" : "KYC Rejected",
      body: action === "approve" ? "You have full access to iVest." : "Please resubmit documents.",
      type: "kyc",
      action_url: action === "approve" ? dashUrl : "/auth/kyc",
    });

    const trustEvent = action === "approve" 
      ? supabase.from("trust_events").insert({ user_id: userId, event_type: "kyc_verified", points: 20 })
      : Promise.resolve();

    // Wrap email in a non-blocking catch so it never fails the request
    const userName = full_name || "User";
    const emailTask = email 
      ? sendEmail({
          to: email,
          subject: action === "approve" ? "✓ Your iVest identity is verified" : "iVest — KYC update",
          html: action === "approve" ? emailTemplates.kycApproved(userName, role || "investor") : emailTemplates.kycRejected(userName),
        }).catch(err => console.error("Email failed:", err))
      : Promise.resolve();

    await Promise.all([notification, trustEvent, emailTask]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("KYC Approval Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}