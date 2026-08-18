-- SQL Migration for Jobs, Applications, and Bookmarks with Full RLS & Permissions

-- 1. Create tables if not already created
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  company_name text NOT NULL,
  company_logo_url text,
  category text DEFAULT 'web2',
  sector text,
  job_type text DEFAULT 'full_time',
  location_type text DEFAULT 'remote',
  location text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text DEFAULT 'USD',
  experience_level text DEFAULT 'mid',
  skills text[],
  apply_url text,
  is_published boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS job_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- 2. Grant Table Permissions to authenticated, anon, and service_role
GRANT ALL ON TABLE jobs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE job_applications TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE job_bookmarks TO postgres, anon, authenticated, service_role;

-- 3. Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for JOBS table
DROP POLICY IF EXISTS "Public jobs are viewable by everyone" ON jobs;
CREATE POLICY "Public jobs are viewable by everyone" 
ON jobs FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can post jobs" ON jobs;
CREATE POLICY "Authenticated users can post jobs" 
ON jobs FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Posters can update own jobs" ON jobs;
CREATE POLICY "Posters can update own jobs" 
ON jobs FOR UPDATE 
TO authenticated 
USING (auth.uid() = posted_by);

DROP POLICY IF EXISTS "Posters can delete own jobs" ON jobs;
CREATE POLICY "Posters can delete own jobs" 
ON jobs FOR DELETE 
TO authenticated 
USING (auth.uid() = posted_by);

-- 5. RLS Policies for JOB APPLICATIONS table
DROP POLICY IF EXISTS "Users can view relevant applications" ON job_applications;
CREATE POLICY "Users can view relevant applications" 
ON job_applications FOR SELECT 
TO authenticated 
USING (
  auth.uid() = applicant_id 
  OR EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.posted_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Applicants can submit applications" ON job_applications;
CREATE POLICY "Applicants can submit applications" 
ON job_applications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Posters can update application status" ON job_applications;
CREATE POLICY "Posters can update application status" 
ON job_applications FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.posted_by = auth.uid()
  )
);

-- 6. RLS Policies for JOB BOOKMARKS table
DROP POLICY IF EXISTS "Users can view own bookmarks" ON job_bookmarks;
CREATE POLICY "Users can view own bookmarks" 
ON job_bookmarks FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookmarks" ON job_bookmarks;
CREATE POLICY "Users can create bookmarks" 
ON job_bookmarks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON job_bookmarks;
CREATE POLICY "Users can delete own bookmarks" 
ON job_bookmarks FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
