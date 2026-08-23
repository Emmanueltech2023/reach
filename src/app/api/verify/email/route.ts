import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { action, userId, email, code } = await req.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // ACTION 1: SEND EMAIL OTP
    if (action === "send_otp") {
      if (!email) {
        return NextResponse.json({ error: "Missing target email address" }, { status: 400 });
      }

      // Generate 6-digit OTP code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save to verification_codes table
      await supabase.from("verification_codes").insert({
        user_id: userId,
        channel: "email",
        target: email,
        code: generatedCode,
        expires_at: expiresAt,
      });

      // HTML Email Template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #0A0A0F; color: #F5F3ED; padding: 30px; borderRadius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid #3A3A52;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #C9A84C; font-size: 24px; margin: 0;">REACH</h1>
            <p style="color: #A8A6B8; font-size: 12px; margin-top: 4px;">Email Verification Code</p>
          </div>
          <p style="font-size: 14px; color: #A8A6B8;">Your 6-digit email confirmation code is:</p>
          <div style="background-color: #1A1A2E; border: 1px solid #C9A84C; border-radius: 12px; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #C9A84C; margin: 20px 0;">
            ${generatedCode}
          </div>
          <p style="font-size: 12px; color: #5C5A70; text-align: center;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
        </div>
      `;

      // Send via Resend API
      try {
        await sendEmail({
          to: email,
          subject: `Your REACH Email Verification Code: ${generatedCode}`,
          html: htmlContent,
        });
      } catch (sendErr) {
        console.warn("Resend email delivery notice:", sendErr);
      }

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${email}`,
        // In local development/test mode, provide preview code for instant test
        debugCode: process.env.NODE_ENV !== "production" ? generatedCode : undefined,
      });
    }

    // ACTION 2: VERIFY EMAIL OTP
    if (action === "verify_otp") {
      if (!code) {
        return NextResponse.json({ error: "Missing verification code" }, { status: 400 });
      }

      // Check code in database
      const { data: record, error: checkErr } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("channel", "email")
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkErr || !record) {
        return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", userId);

      // Clean up used code
      await supabase.from("verification_codes").delete().eq("id", record.id);

      return NextResponse.json({ success: true, message: "Email verified successfully! ✓" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Email verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
