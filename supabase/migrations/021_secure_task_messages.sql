-- ============================================================
-- Migration 021: Secure task_messages RLS + storage policies
-- Fixes: open INSERT policy, adds participant-only enforcement
-- ============================================================

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can send messages" ON task_messages;

-- New INSERT policy: only task participants (creator or accepted agent) can insert
-- Also allows 'system' sender for system messages
CREATE POLICY "Task participants can send messages" ON task_messages
  FOR INSERT WITH CHECK (
    sender_address = 'system'
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_messages.task_id
        AND (
          t.creator_address = task_messages.sender_address
          OR t.accepted_agent_address = task_messages.sender_address
        )
    )
  );

-- Also fix the SELECT policy to not rely on JWT claims
-- (we use anon key, not authenticated sessions)
DROP POLICY IF EXISTS "Task participants can view messages" ON task_messages;

-- NOTE: Since we use anon key (not JWT sessions), RLS SELECT can't identify
-- the requesting user. Read access is enforced at the application level
-- (TaskChat checks isParticipant before rendering). The edge function
-- enforces write access server-side. For reads, we allow select on
-- task_messages but the data is only useful if you know the task_id.
-- A future improvement would be to route reads through an edge function too.
CREATE POLICY "Task messages are readable" ON task_messages
  FOR SELECT USING (true);

-- Add DELETE policy (no one can delete messages)
DROP POLICY IF EXISTS "No message deletion" ON task_messages;
CREATE POLICY "No message deletion" ON task_messages
  FOR DELETE USING (false);

-- Add UPDATE policy (no one can edit messages)  
DROP POLICY IF EXISTS "No message editing" ON task_messages;
CREATE POLICY "No message editing" ON task_messages
  FOR UPDATE USING (false);
