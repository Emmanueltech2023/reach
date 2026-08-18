import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, applicantId, coverLetter, resumeUrl } = body;

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', applicantId)
      .single();

    if (userError || !user) throw new Error('Applicant not found');
    if (user.role !== 'talent') throw new Error('Only talent can apply');

    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', applicantId)
      .single();

    if (existingApp) throw new Error('Already applied to this job');

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: applicantId,
        cover_letter: coverLetter,
        resume_url: resumeUrl
      })
      .select()
      .single();

    if (error) throw error;

    const { data: job } = await supabase
      .from('jobs')
      .select('title, posted_by')
      .eq('id', jobId)
      .single();

    if (job) {
      // Get poster email separately
      const { data: poster } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', job.posted_by)
        .single();

      await supabase.from('notifications').insert({
        user_id: job.posted_by,
        title: 'New job application',
        body: `${user.full_name || 'A job seeker'} applied for ${job.title}`,
        type: 'job_application',
        action_url: `/dashboard/jobs/applicants/${jobId}`
      });

      if (poster?.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
            <h2>New Job Application</h2>
            <p><strong>${user.full_name || 'A talent'}</strong> has just applied for your job posting: <strong>${job.title}</strong>.</p>
            <p>Log in to your dashboard to review their application.</p>
          </div>
        `;
        await sendEmail({
          to: poster.email,
          subject: `New Job Application for ${job.title}`,
          html
        }).catch((err) => console.error("Job apply email send error:", err));
      }
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
