import { NextRequest, NextResponse } from "next/server";
import { requireAuth, adminSupabase as supabase } from "@/lib/auth-server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { data, error } = await supabase
      .from('jobs')
      .select('*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, role)')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const params = await props.params;
    const body = await req.json();
    const { postedBy, ...updates } = body;
    
    const { data: job, error: jobError } = await supabase.from('jobs').select('posted_by').eq('id', params.id).single();
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Only job creator or admin can update
    if (job.posted_by !== auth.user.id && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: You can only edit jobs you posted.' }, { status: 403 });
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const params = await props.params;
    
    const { data: job, error: jobError } = await supabase.from('jobs').select('posted_by').eq('id', params.id).single();
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only job creator or admin can delete
    if (job.posted_by !== auth.user.id && auth.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: You can only delete jobs you posted.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({ is_published: false })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
