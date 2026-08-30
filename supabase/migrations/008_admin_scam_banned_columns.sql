-- SQL Migration: 008_admin_scam_banned_columns.sql
-- Adds is_scam and is_banned columns to public.profiles table

DO $$ 
BEGIN
  -- Profiles: add is_scam and is_banned
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_scam') THEN
    ALTER TABLE public.profiles ADD COLUMN is_scam boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
    ALTER TABLE public.profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for quick admin filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_scam ON public.profiles(is_scam);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
