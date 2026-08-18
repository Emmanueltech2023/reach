import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('job_bookmarks')
      .select('*, jobs(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, jobId } = body;

    const { data: existing, error: findError } = await supabase
      .from('job_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('job_bookmarks')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ bookmarked: false });
    } else {
      const { data, error } = await supabase
        .from('job_bookmarks')
        .insert({ user_id: userId, job_id: jobId })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ bookmarked: true, data });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
