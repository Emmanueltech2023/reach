-- ==============================================================================
-- Migration: Complete Setup for REACH Pre-Launch Waitlist Table & Permissions
-- ==============================================================================

-- 1. Create waitlist_entries table if it does not exist
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'investor',
    country TEXT,
    ticket_size TEXT,
    sectors JSONB DEFAULT '[]'::jsonb,
    startup_name TEXT,
    target_raise TEXT,
    stage TEXT,
    skills TEXT,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist_entries(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON public.waitlist_entries(referral_code);

-- 3. GRANT Table Permissions (Fixes Error 42501: permission denied for table)
GRANT ALL ON TABLE public.waitlist_entries TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.waitlist_entries TO authenticated;
GRANT SELECT, INSERT ON TABLE public.waitlist_entries TO anon;

-- 4. Enable Row Level Security
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist to avoid duplicate policy errors
DROP POLICY IF EXISTS "Allow public insert on waitlist_entries" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Allow service role full access on waitlist_entries" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Allow authenticated users to read waitlist" ON public.waitlist_entries;

-- 6. Create RLS Policies
CREATE POLICY "Allow public insert on waitlist_entries"
ON public.waitlist_entries
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow service role full access on waitlist_entries"
ON public.waitlist_entries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read waitlist"
ON public.waitlist_entries
FOR SELECT
TO authenticated
USING (true);
