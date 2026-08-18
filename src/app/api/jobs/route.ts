import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      .select('*, profiles(full_name, avatar_url, is_verified)');

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
    const body = await req.json();
    // Accept both camelCase and snake_case field names
    const postedBy = body.postedBy || body.posted_by;
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

    if (!postedBy) throw new Error('Missing posted_by field');

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', postedBy)
      .single();

    if (userError || !user) throw new Error('User not found');
    if (!['investor', 'builder', 'admin'].includes(user.role)) {
      throw new Error('Unauthorized to post jobs');
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        posted_by: postedBy,
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
