-- SQL Migration: Universal Activity & Audit Logs Table

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

-- Index for fast queries by timestamp, actor, and action type
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Grant Table Permissions
GRANT ALL ON TABLE public.activity_logs TO postgres, anon, authenticated, service_role;

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view activity logs directly (Service role bypasses RLS)
DROP POLICY IF EXISTS "Only admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Only admins can view activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
