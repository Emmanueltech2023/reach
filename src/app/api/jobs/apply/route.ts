import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { requireAuth, adminSupabase as supabase } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json();
    const { jobId, coverLetter, resumeUrl } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const applicantId = auth.user.id;
    const user = auth.profile;

    // Strict role check: Only talent can apply to jobs
    if (user.role !== 'talent') {
      return NextResponse.json(
        { error: 'Only registered talent accounts can apply to jobs. Please switch or sign in with a talent account.' },
        { status: 403 }
      );
    }

    // Strict KYC check: Candidate must have approved KYC
    if (user.kyc_status !== 'approved') {
      return NextResponse.json(
        { error: 'Identity verification (KYC) is required before submitting job applications.', kycRequired: true },
        { status: 403 }
      );
    }

    // 24h Early Access Check for Pro Talent
    const { data: jobData } = await supabase
      .from('jobs')
      .select('created_at')
      .eq('id', jobId)
      .single();

    if (jobData?.created_at) {
      const diffHours = (Date.now() - new Date(jobData.created_at).getTime()) / (1000 * 60 * 60);
      const isPro = user.subscription_tier === 'pro' || user.subscription_tier === 'premium';
      if (diffHours < 24 && !isPro) {
        const hoursLeft = Math.max(1, Math.ceil(24 - diffHours));
        return NextResponse.json(
          { error: `This position is currently in 24h Early Access for Pro Talent. Public applications open in ${hoursLeft} hours. Upgrade to Pro to apply now.` },
          { status: 403 }
        );
      }
    }

    // 2. Check for duplicate application
    const { data: existingApp } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', applicantId)
      .maybeSingle();

    if (existingApp) {
      return NextResponse.json(
        { error: 'You have already applied to this job listing.' },
        { status: 409 }
      );
    }

    // 3. Insert application into database
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: applicantId,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Send notification and email to job poster
    try {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, posted_by')
        .eq('id', jobId)
        .single();

      if (job?.posted_by) {
        // Insert in-app notification
        await supabase.from('notifications').insert({
          user_id: job.posted_by,
          title: 'New job application',
          body: `${user.full_name || `@${user.username}` || 'A candidate'} applied for ${job.title}`,
          type: 'general'
        });

        // Attempt email notification via Supabase Auth Admin
        const { data: authUser } = await supabase.auth.admin.getUserById(job.posted_by);
        const posterEmail = authUser?.user?.email;

        if (posterEmail) {
          const html = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
              <div style="max-width: 520px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
                <h1 style="font-size: 22px; font-weight: 700; color: #F5F3ED; margin: 0 0 6px;">R<span style="color: #C9A84C;">EACH</span> Jobs</h1>
                <p style="color: #C9A84C; font-size: 11px; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.5px;">Talent & Recruitment Dealflow</p>
                <h2 style="font-size: 18px; font-weight: 600; color: #F5F3ED; margin: 0 0 12px;">New Job Application Received</h2>
                <p style="color: #A8A6B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                  <strong style="color: #F5F3ED;">${user.full_name || `@${user.username}`}</strong> has submitted an application for your listing: <strong style="color: #C9A84C;">${job.title}</strong>.
                </p>
                <p style="color: #5C5A70; font-size: 13px; margin: 0 0 24px;">Log in to your dashboard to review their credentials, resume, and manage their application status.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/jobs/applicants/${jobId}" 
                   style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Review Applicants
                </a>
              </div>
            </body>
            </html>
          `;
          await sendEmail({
            to: posterEmail,
            subject: `New Application for ${job.title} — REACH`,
            html
          }).catch((err) => console.error("Job apply email send error:", err));
        }
      }
    } catch (notifErr) {
      console.warn("Non-fatal notification error in job apply:", notifErr);
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err: any) {
    console.error("Job apply route error:", err);
    return NextResponse.json({ error: err.message || 'Failed to submit application' }, { status: 500 });
  }
}
