-- ==============================================================================
-- REACH PLATFORM: SAFE TEST DATA CLEANUP & DATABASE RESET SCRIPT
-- ==============================================================================
-- PURPOSE: Safely wipes all test users, messages, deals, jobs, applications, and activity
--          without failing if any table is missing, while PRESERVING the Super Admin account.
-- ==============================================================================

DO $$ 
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'messages',
    'conversations',
    'conversation_participants',
    'deals',
    'deal_documents',
    'job_applications',
    'job_bookmarks',
    'jobs',
    'notifications',
    'bookmarks',
    'community_likes',
    'community_comments',
    'community_posts',
    'referrals',
    'kyc_verifications',
    'activity_logs'
  ];
BEGIN
  -- 1. Safely truncate each existing activity table
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tbl);
      RAISE NOTICE 'Truncated table: %', tbl;
    END IF;
  END LOOP;
END $$;

-- 2. DELETE ALL REGULAR USERS FROM PROFILES (PRESERVE ADMIN PROFILE)
DELETE FROM profiles 
WHERE role IS NULL OR role != 'admin';

-- 3. DELETE ALL REGULAR USERS FROM SUPABASE AUTH USERS (PRESERVE ADMIN AUTH ACCOUNT)
DELETE FROM auth.users 
WHERE id NOT IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- ==============================================================================
-- VERIFICATION CHECK: DISPLAY REMAINING ADMIN ACCOUNTS
-- ==============================================================================
SELECT id, full_name, username, role, subscription_tier 
FROM profiles;
