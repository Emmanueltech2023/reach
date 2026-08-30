import { NextRequest, NextResponse } from "next/server";
import { requireAuth, adminSupabase as supabase } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const sector = searchParams.get('sector');
    const jobType = searchParams.get('job_type');
    const locationType = searchParams.get('location_type');
    const experienceLevel = searchParams.get('experience_level');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const postedBy = searchParams.get('postedBy');

    let query = supabase
      .from('jobs')
      .select('*, profiles(id, full_name, username, avatar_url, is_verified, is_scam, is_banned, subscription_tier, role)');

    // When fetching own jobs (manage page), show all including drafts
    if (postedBy) {
      query = query.eq('posted_by', postedBy);
    } else {
      query = query.eq('is_published', true);
    }

    if (category) query = query.eq('category', category);
    if (sector) query = query.eq('sector', sector);
    if (jobType) query = query.eq('job_type', jobType);
    if (locationType) query = query.eq('location_type', locationType);
    if (experienceLevel) query = query.eq('experience_level', experienceLevel);
    if (search) query = query.ilike('title', `%${search}%`);
    if (featured !== null && !postedBy) query = query.eq('is_featured', featured === 'true');

    query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ jobs: data });
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

    if (!['investor', 'builder', 'admin'].includes(auth.profile.role)) {
      return NextResponse.json({ error: 'Unauthorized: Only employers/builders/investors can post jobs' }, { status: 403 });
    }

    if (auth.profile.kyc_status !== 'approved') {
      return NextResponse.json(
        { error: 'Identity verification (KYC) is required before posting job listings.', kycRequired: true },
        { status: 403 }
      );
    }

    const body = await req.json();
    const title = body.title;
    const description = body.description;
    const companyName = body.companyName || body.company_name;
    const companyLogoUrl = body.companyLogoUrl || body.company_logo_url;
    const category = body.category;
    const sector = body.sector;
    const jobType = body.jobType || body.job_type;
    const locationType = body.locationType || body.location_type;
    const location = body.location;
    const salaryMin = body.salaryMin || body.salary_min;
    const salaryMax = body.salaryMax || body.salary_max;
    const salaryCurrency = body.salaryCurrency || body.salary_currency;
    const experienceLevel = body.experienceLevel || body.experience_level;
    const skills = body.skills;
    const applyUrl = body.applyUrl || body.apply_url || body.external_apply_url;
    const isPublished = body.is_published !== undefined ? body.is_published : true;

    if (!title || !description || !companyName) {
      return NextResponse.json({ error: 'Title, description, and company name are required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        posted_by: auth.user.id, // Strictly bind to authenticated user session
        title,
        description,
        company_name: companyName,
        company_logo_url: companyLogoUrl,
        category,
        sector,
        job_type: jobType,
        location_type: locationType,
        location,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        experience_level: experienceLevel,
        skills,
        apply_url: applyUrl,
        is_published: isPublished
      })
      .select()
      .single();

    if (error) throw error;

    // Dispatch priority notification & email for Pro/Premium Talent users
    try {
      const { data: proTalentProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'talent')
        .in('subscription_tier', ['pro', 'premium']);

      if (proTalentProfiles && proTalentProfiles.length > 0) {
        const notifInserts = proTalentProfiles.map((p: any) => ({
          user_id: p.id,
          title: `⚡ Priority Job Access: ${title}`,
          body: `${companyName} just posted a new position for ${title}. As a Pro talent member, you get 24h early access to apply.`,
          type: 'job_application',
          action_url: `/dashboard/talent/job/${data.id}`,
        }));

        const { error: insErr } = await supabase.from('notifications').insert(notifInserts);
        if (insErr) console.warn('Pro talent notif insert error:', insErr);

        // Dispatch email to Pro talent members via Supabase Auth Admin
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const { sendEmail } = await import('@/lib/email');

        for (const target of proTalentProfiles) {
          const { data: authUser } = await supabase.auth.admin.getUserById(target.id);
          if (authUser?.user?.email) {
            void sendEmail({
              to: authUser.user.email,
              subject: `⚡ Priority Job Alert: ${title} at ${companyName}`,
              html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
                  <div style="max-width: 520px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
                    <h1 style="font-size: 22px; font-weight: 700; color: #F5F3ED; margin: 0 0 6px;">R<span style="color: #C9A84C;">EACH</span></h1>
                    <p style="color: #C9A84C; font-size: 11px; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.5px;">Pro Talent Early Access</p>
                    <h2 style="font-size: 18px; font-weight: 700; color: #C9A84C; margin: 0 0 12px;">⚡ Priority Job Listing Posted!</h2>
                    <p style="color: #A8A6B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                      <strong style="color: #F5F3ED;">${companyName}</strong> just posted a new opening for <strong style="color: #C9A84C;">${title}</strong>. As a Pro Talent member, your profile gets highlighted to recruiters.
                    </p>
                    <a href="${appUrl}/dashboard/talent/job/${data.id}" 
                       style="display: inline-block; background: #C9A84C; color: #0A0A0F; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
                      View & Apply First
                    </a>
                  </div>
                </body>
                </html>
              `
            }).catch((e) => console.warn('Pro talent email dispatch error:', e));
          }
        }
      }
    } catch (notifErr) {
      console.warn('Non-blocking pro talent notification error:', notifErr);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
