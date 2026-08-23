import { NextRequest, NextResponse } from "next/server";
import { requireAuth, adminSupabase as supabase } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    const targetUserId = (auth.profile.role === 'admin' && requestedUserId) ? requestedUserId : auth.user.id;

    const { data, error } = await supabase
      .from('job_bookmarks')
      .select('*, jobs(*)')
      .eq('user_id', targetUserId);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
    }

    const userId = auth.user.id;

    const { data: existing } = await supabase
      .from('job_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

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
