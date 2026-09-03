import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminSupabase as supabase } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }

    const { entryId, status } = await req.json();

    if (!entryId || !status) {
      return NextResponse.json(
        { error: "Entry ID and status are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({ status })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
