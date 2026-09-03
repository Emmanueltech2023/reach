import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      role,
      country,
      ticketSize,
      sectors,
      startupName,
      targetRaise,
      stage,
      skills,
      referredBy,
    } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const referralCode = `RCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 1. Check if email already registered in waitlist_entries
    const { data: existing, error: findError } = await adminSupabase
      .from("waitlist_entries")
      .select("id, referral_code, created_at")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      const { count } = await adminSupabase
        .from("waitlist_entries")
        .select("*", { count: "exact", head: true })
        .lte("created_at", existing.created_at);

      return NextResponse.json({
        success: true,
        message: "You are already on the waitlist!",
        position: (count || 1) + 120,
        referralCode: existing.referral_code,
      });
    }

    const entryData = {
      full_name: fullName.trim(),
      email: cleanEmail,
      role,
      country: country || null,
      ticket_size: ticketSize || null,
      sectors: sectors || [],
      startup_name: startupName || null,
      target_raise: targetRaise || null,
      stage: stage || null,
      skills: skills || null,
      referral_code: referralCode,
      referred_by: referredBy || null,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // 2. Insert into Supabase table
    const { data, error: insertError } = await adminSupabase
      .from("waitlist_entries")
      .insert(entryData)
      .select()
      .single();

    if (insertError) {
      console.error("Supabase waitlist_entries insert error:", insertError);
      return NextResponse.json(
        { error: `Database insert error: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 3. Calculate position
    const { count } = await adminSupabase
      .from("waitlist_entries")
      .select("*", { count: "exact", head: true });

    const position = (count || 1) + 120;

    return NextResponse.json({
      success: true,
      position,
      referralCode,
      entry: data,
      message: "Successfully joined the REACH Private Beta Waitlist!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Waitlist API route exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await adminSupabase
      .from("waitlist_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: data?.length || 0, entries: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
