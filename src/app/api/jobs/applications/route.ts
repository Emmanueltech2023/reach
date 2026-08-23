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
        .select('*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, trust_score, bio, country, website, linkedin, twitter, category, investment_focus)')
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
        .select('*, jobs(*), profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, trust_score, bio, country)')
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

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Missing applicationId or status' }, { status: 400 });
    }

    // 1. Fetch current application & job details
    const { data: existingApp, error: fetchError } = await supabase
      .from('job_applications')
      .select('*, jobs(id, title, company_name, posted_by)')
      .eq('id', applicationId)
      .single();

    if (fetchError || !existingApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // 2. Update status
    const { data, error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    // 3. Dispatch Notification to Applicant
    const applicantId = existingApp.applicant_id;
    const jobTitle = existingApp.jobs?.title || 'the position';
    const companyName = existingApp.jobs?.company_name || 'the hiring team';

    let notifTitle = `Application Update: ${jobTitle}`;
    let notifBody = `Your application for ${jobTitle} at ${companyName} has been updated to ${status}.`;

    if (status.toLowerCase() === 'hired') {
      notifTitle = `🎉 You've been Hired!`;
      notifBody = `Congratulations! You have been hired for ${jobTitle} at ${companyName}. Check your dashboard to connect with the team.`;
    } else if (status.toLowerCase() === 'shortlisted') {
      notifTitle = `⭐ Application Shortlisted`;
      notifBody = `Great news! Your application for ${jobTitle} at ${companyName} has been shortlisted!`;
    } else if (status.toLowerCase() === 'reviewed') {
      notifTitle = `Application Reviewed`;
      notifBody = `The hiring manager has reviewed your application for ${jobTitle} at ${companyName}.`;
    } else if (status.toLowerCase() === 'rejected') {
      notifTitle = `Application Closed: ${jobTitle}`;
      notifBody = `The hiring team has completed reviewing applications for ${jobTitle} at ${companyName}.`;
    }

    try {
      if (applicantId) {
        await supabase.from('notifications').insert({
          user_id: applicantId,
          title: notifTitle,
          body: notifBody,
          type: 'job_application',
          action_url: '/dashboard/talent/applications'
        });

        // Safe email dispatch via Supabase Auth Admin
        const { data: authUser } = await supabase.auth.admin.getUserById(applicantId);
        const applicantEmail = authUser?.user?.email;

        if (applicantEmail && status.toLowerCase() === 'hired') {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const { sendEmail } = await import('@/lib/email');
          await sendEmail({
            to: applicantEmail,
            subject: `🎉 Congratulations! You have been hired for ${jobTitle}`,
            html: `
              <!DOCTYPE html>
              <html>
              <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
                <div style="max-width: 520px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
                  <h1 style="font-size: 22px; font-weight: 700; color: #F5F3ED; margin: 0 0 6px;">R<span style="color: #C9A84C;">EACH</span></h1>
                  <p style="color: #C9A84C; font-size: 11px; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.5px;">Job Offer Notification</p>
                  <h2 style="font-size: 20px; font-weight: 700; color: #10B981; margin: 0 0 12px;">🎉 You've Been Hired!</h2>
                  <p style="color: #A8A6B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                    We are thrilled to inform you that <strong style="color: #F5F3ED;">${companyName}</strong> has extended an offer for the <strong style="color: #C9A84C;">${jobTitle}</strong> position.
                  </p>
                  <p style="color: #5C5A70; font-size: 13px; margin: 0 0 24px;">Log in to your REACH dashboard to view your application tracker and message your hiring manager directly.</p>
                  <a href="${appUrl}/dashboard/talent/applications" 
                     style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
                    View My Applications
                  </a>
                </div>
              </body>
              </html>
            `
          });
        }
      }
    } catch (notifErr) {
      console.warn('Non-blocking notification error on status update:', notifErr);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
