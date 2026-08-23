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
      .select('*, profiles(id, full_name, username, avatar_url, is_verified, subscription_tier, role)');

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
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
