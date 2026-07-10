import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    const { data } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", username)
      .single();

    return NextResponse.json({ taken: !!data });
  } catch {
    return NextResponse.json({ taken: false });
  }
}