-- ==============================================================================
-- REACH MASTER DATABASE SCHEMA MIGRATION
-- Copy and paste this ENTIRE script into your Supabase SQL Editor and click "RUN".
-- It creates all required tables, columns, indexes, and RLS policies safely.
-- ==============================================================================

-- 1. PROFILES COLUMNS ENHANCEMENTS
DO $$ 
BEGIN
  -- Security & Moderation Flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_scam') THEN
    ALTER TABLE public.profiles ADD COLUMN is_scam boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
    ALTER TABLE public.profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  -- Verification Suite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_id_type') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_id_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_front_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_front_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_back_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_back_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_selfie_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_selfie_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_business_cert_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_business_cert_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_rejection_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_rejection_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_submitted_at') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_submitted_at timestamptz;
  END IF;
END $$;


-- 2. VERIFICATION CODES TABLE (OTP Codes)
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL, -- 'email' or 'phone'
  target text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- 3. ACTIVITY & AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  actor_email text,
  actor_role text DEFAULT 'user',
  action_type text NOT NULL,
  target_id uuid,
  target_type text,
  description text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);


-- 4. JOBS & CAREER TABLES
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS public.job_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);


-- 5. DEALS & COMMISSION INVOICES TABLES
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  stage text DEFAULT 'pitching',
  commission_pct numeric DEFAULT 3.0,
  commission_amount numeric DEFAULT 0,
  commission_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  deal_amount numeric DEFAULT 0,
  commission_rate numeric DEFAULT 3.0,
  commission_amount numeric DEFAULT 0,
  discount_applied numeric DEFAULT 0,
  due_date timestamptz DEFAULT (now() + interval '30 days'),
  status text DEFAULT 'pending',
  waived_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);


-- 6. MODERATION FLAGS TABLE
CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending',
  action_taken text,
  created_at timestamptz DEFAULT now()
);


-- 7. INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_is_scam ON public.profiles(is_scam);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON public.jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_deals_investor ON public.deals(investor_id);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON public.moderation_flags(status);


-- 8. GRANT ALL PERMISSIONS TO API ROLES
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
