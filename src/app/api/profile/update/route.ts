import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Debug — log what we have
    console.log("Supabase URL:", url ? "found" : "MISSING");
    console.log("Service role key:", key ? "found" : "MISSING");

    if (!url || !key) {
      return NextResponse.json(
        { error: "Missing Supabase credentials in environment" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);

    const body = await req.json();
    const { userId, updates } = body;

    console.log("userId:", userId);
    console.log("updates:", updates);

    if (!userId) {
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    const { error } = await supabase
  .from("profiles")
  .upsert({
    id: userId,
    ...updates,
    ...(updates.username && { username: updates.username.toLowerCase() }),
  });

    if (error) {
      console.log("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.log("Caught error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}