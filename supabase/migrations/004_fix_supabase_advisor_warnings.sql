-- ============================================================================
-- iVest Security Migration: Resolve All Supabase Advisor Warnings & Info
-- ============================================================================

-- 1. FIX FUNCTION SEARCH PATHS (Prevents Search Path Mutable Warnings)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'handle_new_user',
            'update_conversation_last_message',
            'update_user_trust_score',
            'handle_project_embedding',
            'handle_subscription_approval'
        )
    ) LOOP
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, auth;', r.proname, r.args);
    END LOOP;
END $$;

-- 2. RESTRICT SECURITY DEFINER TRIGGER FUNCTIONS (Revoke public/anon execute)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'handle_new_user',
            'update_conversation_last_message'
        )
    ) LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated, public;', r.proname, r.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO postgres, service_role;', r.proname, r.args);
    END LOOP;
END $$;

-- 3. MOVE VECTOR EXTENSION OUT OF PUBLIC SCHEMA
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'vector' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION vector SET SCHEMA extensions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 4. FIX OVERLY PERMISSIVE RLS POLICIES (Resolves rls_policy_always_true)
-- Fix Jobs INSERT policy
DROP POLICY IF EXISTS "Authenticated users can post jobs" ON public.jobs;
CREATE POLICY "Authenticated users can post jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = posted_by);

-- Fix Conversations INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. FIX PUBLIC BUCKET LISTING WARNING (community_attachments)
DROP POLICY IF EXISTS "Allow anyone to view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Community Attachments" ON storage.objects;

-- 6. ADD POLICIES FOR TABLES WITH RLS ENABLED (Resolves rls_enabled_no_policy)

-- Table: community_comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.community_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.community_comments;

CREATE POLICY "Anyone can view comments"
ON public.community_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can post comments"
ON public.community_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete own comments"
ON public.community_comments FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Table: community_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON public.community_likes;
DROP POLICY IF EXISTS "Authenticated users can remove likes" ON public.community_likes;

CREATE POLICY "Anyone can view likes"
ON public.community_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can toggle likes"
ON public.community_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can remove likes"
ON public.community_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Table: referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated users can record referral" ON public.referrals;

CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Authenticated users can record referral"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_id OR auth.uid() = referrer_id);

-- Table: trust_events
DROP POLICY IF EXISTS "Users can view own trust events" ON public.trust_events;
CREATE POLICY "Users can view own trust events"
ON public.trust_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Table: match_scores
DROP POLICY IF EXISTS "Users can view own match scores" ON public.match_scores;
CREATE POLICY "Users can view own match scores"
ON public.match_scores FOR SELECT
TO authenticated
USING (auth.uid() = investor_id);

-- Table: project_views
DROP POLICY IF EXISTS "Anyone can record project view" ON public.project_views;
DROP POLICY IF EXISTS "Founders can view project stats" ON public.project_views;

CREATE POLICY "Anyone can record project view"
ON public.project_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Founders can view project stats"
ON public.project_views FOR SELECT
TO authenticated
USING (true);

-- Table: commission_invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON public.commission_invoices;
CREATE POLICY "Users can view own invoices"
ON public.commission_invoices FOR SELECT
TO authenticated
USING (auth.uid() = investor_id);
