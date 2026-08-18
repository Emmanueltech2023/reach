-- SQL Migration for iVest Community Social Platform (PostgreSQL & Supabase compatible)

-- 1. Ensure image_url column exists on community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Create storage bucket for community attachments if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('community_attachments', 'community_attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Allow public reads on community attachments
DROP POLICY IF EXISTS "Public Read Community Attachments" ON storage.objects;
CREATE POLICY "Public Read Community Attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'community_attachments');

-- 4. Allow authenticated users to upload community attachments
DROP POLICY IF EXISTS "Authenticated Upload Community Attachments" ON storage.objects;
CREATE POLICY "Authenticated Upload Community Attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community_attachments');
