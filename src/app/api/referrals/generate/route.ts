import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    // Check if user already has a code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .single();

    if (profile?.referral_code) {
      return NextResponse.json({ code: profile.referral_code });
    }

    // Generate unique code
    let code = generateCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code)
        .single();

      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", userId);

    return NextResponse.json({ code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}