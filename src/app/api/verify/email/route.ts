import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Enforce Rate Limiting (Max 5 OTP requests per minute per IP)
    const clientIp = req.headers.get("x-forwarded-for") || "client-ip";
    const limit = checkRateLimit(`email-otp:${clientIp}`, 5, 60 * 1000);
    if (!limit.success) {
      return NextResponse.json(
        { error: `Too many verification requests. Please wait ${limit.reset} seconds before trying again.` },
        { status: 429 }
      );
    }

    const { action, userId, email, code } = await req.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // ACTION 1: SEND EMAIL OTP
    if (action === "send_otp") {
      let targetEmail = (email || "").trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!targetEmail || !emailRegex.test(targetEmail)) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.user?.email) {
            targetEmail = authUser.user.email;
          }
        } catch (authFetchErr) {
          console.warn("Auth user email fetch fallback warning:", authFetchErr);
        }
      }

      if (!targetEmail || !emailRegex.test(targetEmail)) {
        return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
      }

      // Generate 6-digit OTP code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save to verification_codes table
      await supabase.from("verification_codes").insert({
        user_id: userId,
        channel: "email",
        target: targetEmail,
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
          to: targetEmail,
          subject: `Your REACH Email Verification Code: ${generatedCode}`,
          html: htmlContent,
        });
      } catch (sendErr) {
        console.warn("Resend email delivery notice:", sendErr);
      }

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${targetEmail}`,
      });
    }

    // ACTION 2: VERIFY EMAIL OTP
    if (action === "verify_otp") {
      const cleanCode = String(code || "").trim();
      if (!cleanCode) {
        return NextResponse.json({ error: "Please enter your 6-digit verification code." }, { status: 400 });
      }

      // Fetch the latest verification code for this user
      const { data: record, error: checkErr } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("channel", "email")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkErr || !record) {
        return NextResponse.json({ error: "No verification code requested. Please click 'Send Code' first." }, { status: 400 });
      }

      if (record.code !== cleanCode) {
        return NextResponse.json({ error: "Incorrect verification code. Please check your email and try again." }, { status: 400 });
      }

      const isExpired = new Date(record.expires_at).getTime() < Date.now();
      if (isExpired) {
        return NextResponse.json({ error: "Verification code has expired. Please click 'Resend Code'." }, { status: 400 });
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ email_verified: true, is_verified: true })
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
