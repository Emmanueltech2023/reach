-- ============================================================================
-- iVest Security Migration: Complete Row Level Security (RLS) Lockdown
-- Resolves all Supabase database linter errors & protects public tables
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deals ENABLE ROW LEVEL SECURITY;

-- 2. GRANT PERMISSIONS (Allows Supabase roles to query according to RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- TABLE: PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Anyone can view public profile details (directory, candidate lists, deal room)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Authenticated users can insert their own profile upon signup
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Authenticated users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TABLE: PROJECTS
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view published projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can update projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can delete projects" ON public.projects;

CREATE POLICY "Anyone can view published projects"
ON public.projects FOR SELECT
USING (true);

CREATE POLICY "Founders can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Founders can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = founder_id)
WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Founders can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = founder_id);

-- ============================================================================
-- TABLE: CONVERSATIONS & PARTICIPANTS
-- ============================================================================
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "Participants can view their conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Participants can view conversation members"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join conversations"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLE: MESSAGES
-- ============================================================================
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- ============================================================================
-- TABLE: BOOKMARKS
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
ON public.bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: MEETINGS & PARTICIPANTS
-- ============================================================================
DROP POLICY IF EXISTS "Participants can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Organizers can manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Participants can view meeting members" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can join meetings" ON public.meeting_participants;

CREATE POLICY "Participants can view meetings"
ON public.meetings FOR SELECT
TO authenticated
USING (
  organizer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = meetings.id
    AND mp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create meetings"
ON public.meetings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can manage meetings"
ON public.meetings FOR UPDATE
TO authenticated
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Participants can view meeting members"
ON public.meeting_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_participants mp
    WHERE mp.meeting_id = meeting_participants.meeting_id
    AND mp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join meetings"
ON public.meeting_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLE: NOTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: UPGRADE REQUESTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Users can submit upgrade requests" ON public.upgrade_requests;

CREATE POLICY "Users can view own upgrade requests"
ON public.upgrade_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit upgrade requests"
ON public.upgrade_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
