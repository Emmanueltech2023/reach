import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization: Verify Admin Role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Ensure the caller is strictly an admin
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    // 2. Perform the update atomically
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 3. Execution
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        kyc_status: action === "approve" ? "approved" : "rejected",
        is_verified: action === "approve",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 4. Notify user
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: action === "approve" ? "KYC Approved ✓" : "KYC Rejected",
      body: action === "approve"
        ? "Your identity has been verified. You now have full access to iVest."
        : "Your KYC submission was rejected. Please resubmit with clearer documents.",
      type: "kyc",
      action_url: action === "approve" ? "/dashboard/investor" : "/auth/kyc",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}