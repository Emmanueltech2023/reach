-- Fix RLS policy on conversation_participants to avoid infinite recursion
-- Drop existing recursive policies if present
DROP POLICY IF EXISTS "Users can view conversation_participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation_participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Enable RLS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Non-recursive policy for SELECT
CREATE POLICY "Users can view their own participant records" ON conversation_participants
FOR SELECT USING (
  user_id = auth.uid()
);

-- Service role bypass / authenticated insert policy
CREATE POLICY "Users can insert participant records" ON conversation_participants
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);
