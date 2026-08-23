import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, idType, frontUrl, backUrl, selfieUrl, businessCertUrl } = await req.json();

    if (!userId || !idType || !frontUrl || !selfieUrl) {
      return NextResponse.json(
        { error: "Missing required KYC documents (ID Type, Front ID Image, and Selfie Photo are required)" },
        { status: 400 }
      );
    }

    // Check user profile role
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, full_name, username")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // If builder, business cert is strongly recommended
    if (profile.role === "builder" && !businessCertUrl) {
      console.warn("Notice: Builder submitting KYC without Business Registration Cert");
    }

    // Update profile with KYC document payload
    const { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
        kyc_id_type: idType,
        kyc_front_url: frontUrl,
        kyc_back_url: backUrl || null,
        kyc_selfie_url: selfieUrl,
        kyc_business_cert_url: businessCertUrl || null,
        kyc_rejection_reason: null, // Clear any prior rejection notes
        kyc_submitted_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    // Create system notification for user
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "⏳ KYC Identity Documents Submitted",
      body: "Your identity verification documents have been received and are pending review by the compliance team.",
      type: "general",
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      message: "KYC documents submitted successfully! Compliance team will review shortly.",
      profile: updatedProfile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "KYC submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
