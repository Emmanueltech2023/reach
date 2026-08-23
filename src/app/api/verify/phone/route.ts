import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { action, userId, phone, code } = await req.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // ACTION 1: SEND PHONE SMS OTP
    if (action === "send_otp") {
      if (!phone) {
        return NextResponse.json({ error: "Missing phone number" }, { status: 400 });
      }

      // Generate 6-digit OTP code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // Save to verification_codes table
      await supabase.from("verification_codes").insert({
        user_id: userId,
        channel: "phone",
        target: phone,
        code: generatedCode,
        expires_at: expiresAt,
      });

      // Also save phone number to user profile
      await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", userId);

      // Check if Twilio API keys exist in env
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      let smsSent = false;

      if (accountSid && authToken && twilioPhone) {
        try {
          const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          const params = new URLSearchParams({
            To: phone,
            From: twilioPhone,
            Body: `Your REACH phone verification code is: ${generatedCode}. Expires in 5 minutes.`,
          });

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            }
          );

          if (twilioRes.ok) {
            smsSent = true;
          } else {
            const twilioErr = await twilioRes.text();
            console.warn("Twilio SMS send notice:", twilioErr);
          }
        } catch (twilioErr) {
          console.warn("Twilio exception notice:", twilioErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: smsSent ? `SMS verification code sent to ${phone}` : `Verification code generated for ${phone} (Sandbox Mode)`,
        // Sandbox mode returns preview code for easy $0 test
        sandboxCode: generatedCode,
      });
    }

    // ACTION 2: VERIFY PHONE OTP
    if (action === "verify_otp") {
      if (!code) {
        return NextResponse.json({ error: "Missing verification code" }, { status: 400 });
      }

      // Check code in database
      const { data: record, error: checkErr } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("channel", "phone")
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkErr || !record) {
        return NextResponse.json({ error: "Invalid or expired SMS verification code" }, { status: 400 });
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ phone_verified: true })
        .eq("id", userId);

      // Clean up used code
      await supabase.from("verification_codes").delete().eq("id", record.id);

      return NextResponse.json({ success: true, message: "Phone number verified successfully! ✓" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Phone verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
