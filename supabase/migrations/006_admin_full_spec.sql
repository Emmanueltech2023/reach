-- SQL Migration: 006_admin_full_spec.sql
-- Enables tables and columns required for 100% full coverage of the 12 Admin Systems

-- 1. Ensure Deals Table Exists
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  stage text DEFAULT 'pitching', -- 'pitching', 'due_diligence', 'term_sheet', 'closed_won', 'closed_lost'
  commission_pct numeric DEFAULT 3.0,
  commission_amount numeric DEFAULT 0,
  commission_status text DEFAULT 'pending', -- 'pending', 'paid', 'waived'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Ensure Commission Invoices Table Exists
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
  status text DEFAULT 'pending', -- 'pending', 'paid', 'waived'
  waived_reason text,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. Ensure Moderation Flags Table Exists (for Flagged Direct Messages)
CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- 4. Add missing columns to existing tables if absent
DO $$ 
BEGIN
  -- Projects: add is_pinned and is_fraudulent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_pinned') THEN
    ALTER TABLE public.projects ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_fraudulent') THEN
    ALTER TABLE public.projects ADD COLUMN is_fraudulent boolean DEFAULT false;
  END IF;

  -- Community Posts: add is_approved and is_pinned
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='is_approved') THEN
    ALTER TABLE public.community_posts ADD COLUMN is_approved boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='is_pinned') THEN
    ALTER TABLE public.community_posts ADD COLUMN is_pinned boolean DEFAULT false;
  END IF;
END $$;

-- 5. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_deals_investor_id ON public.deals(investor_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_commission_invoices_status ON public.commission_invoices(status);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON public.moderation_flags(status);

-- 6. Permissions & RLS
GRANT ALL ON TABLE public.deals TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.commission_invoices TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.moderation_flags TO postgres, anon, authenticated, service_role;

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;

-- Only admins and owners can access deals/invoices/flags
DROP POLICY IF EXISTS "Admins full access deals" ON public.deals;
CREATE POLICY "Admins full access deals" ON public.deals FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access invoices" ON public.commission_invoices;
CREATE POLICY "Admins full access invoices" ON public.commission_invoices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access flags" ON public.moderation_flags;
CREATE POLICY "Admins full access flags" ON public.moderation_flags FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
