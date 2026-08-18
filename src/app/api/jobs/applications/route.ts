import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicantId = searchParams.get('applicantId');
    const jobId = searchParams.get('jobId');
    const posterId = searchParams.get('posterId');

    if (applicantId) {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, jobs(*)')
        .eq('applicant_id', applicantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    if (jobId) {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*, profiles(id, full_name, username, avatar_url, is_verified, trust_score, bio, country)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    if (posterId) {
      // Two-step: get jobs by poster, then applications for those jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('posted_by', posterId);
      if (jobsError) throw jobsError;

      const jobIds = (jobs || []).map((j: any) => j.id);
      if (jobIds.length === 0) return NextResponse.json([]);

      const { data, error } = await supabase
        .from('job_applications')
        .select('*, jobs(*), profiles(id, full_name, username, avatar_url, is_verified)')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json(data || []);
    }

    return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, status } = body;
    const { data, error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
