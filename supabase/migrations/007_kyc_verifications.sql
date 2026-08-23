-- SQL Migration: 007_kyc_verifications.sql
-- Enables Bank-Grade Identity Verification Suite: KYC Document Uploads, Email OTP, and Phone Verification

DO $$ 
BEGIN
  -- Email Verified
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  -- Phone Verified
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  -- KYC ID Type (passport, national_id, drivers_license)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_id_type') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_id_type text;
  END IF;

  -- KYC Document Front Image URL (Cloudinary)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_front_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_front_url text;
  END IF;

  -- KYC Document Back Image URL (Cloudinary)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_back_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_back_url text;
  END IF;

  -- KYC Selfie Photo URL (Cloudinary)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_selfie_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_selfie_url text;
  END IF;

  -- KYC Business Registration Cert URL (Cloudinary - for Builders/Founders)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_business_cert_url') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_business_cert_url text;
  END IF;

  -- KYC Rejection Reason Note
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_rejection_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_rejection_reason text;
  END IF;

  -- KYC Submitted Timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_submitted_at') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_submitted_at timestamptz;
  END IF;
END $$;

-- Table for temporary OTP codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL, -- 'email' or 'phone'
  target text NOT NULL, -- email address or phone number
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS & Grants
GRANT ALL ON TABLE public.verification_codes TO postgres, anon, authenticated, service_role;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own codes" ON public.verification_codes;
CREATE POLICY "Users view own codes" ON public.verification_codes FOR ALL TO authenticated
USING (user_id = auth.uid());
