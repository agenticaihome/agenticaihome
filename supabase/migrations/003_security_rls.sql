-- Migration: 003_security_rls
-- Description: Lock down RLS policies for all core tables
-- Since the app uses wallet-based identity (no Supabase Auth),
-- we allow SELECT/INSERT publicly but restrict UPDATE and block DELETE.

-- ============================================================
-- DROP any existing permissive policies (safety net)
-- ============================================================
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('agents', 'tasks', 'task_bids', 'completions', 'reputation_events', 'disputes', 'notifications', 'wallet_profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- AGENTS
-- ============================================================
-- Anyone can read agents (public marketplace)
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);

-- Anyone can register an agent
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (true);

-- UPDATE: Only allow safe field updates. Block ego_score, tier, tasks_completed, status manipulation.
-- We use a column-check approach: the update must NOT change protected fields.
CREATE POLICY "agents_update" ON agents FOR UPDATE USING (true)
  WITH CHECK (
    -- Protected fields must remain unchanged (compared via subquery)
    ego_score = (SELECT ego_score FROM agents WHERE id = agents.id)
    AND tasks_completed = (SELECT tasks_completed FROM agents WHERE id = agents.id)
    AND status = (SELECT status FROM agents WHERE id = agents.id)
    AND tier = (SELECT tier FROM agents WHERE id = agents.id)
    AND owner_address = (SELECT owner_address FROM agents WHERE id = agents.id)
  );

-- No DELETE allowed
CREATE POLICY "agents_no_delete" ON agents FOR DELETE USING (false);

-- ============================================================
-- TASKS
-- ============================================================
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (true);

-- UPDATE: Block direct manipulation of escrow_tx_id and assigned_agent_id
-- These should only change through proper workflow
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (true)
  WITH CHECK (true);
  -- Note: Ideally we'd restrict escrow_tx_id/assigned_agent_id changes,
  -- but these need to be updated by the app flow. Without Supabase Auth,
  -- we can't distinguish legitimate vs malicious updates at RLS level.
  -- Recommend moving writes to Edge Functions for full protection.

CREATE POLICY "tasks_no_delete" ON tasks FOR DELETE USING (false);

-- ============================================================
-- BIDS (task_bids / bids — check actual table name)
-- ============================================================
-- The app code references 'bids' table but schema has 'task_bids'
-- Create policies for both if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_bids' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "task_bids_select" ON task_bids FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "task_bids_insert" ON task_bids FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "task_bids_no_update" ON task_bids FOR UPDATE USING (false)';
    EXECUTE 'CREATE POLICY "task_bids_no_delete" ON task_bids FOR DELETE USING (false)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bids' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "bids_select" ON bids FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "bids_insert" ON bids FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "bids_no_update" ON bids FOR UPDATE USING (false)';
    EXECUTE 'CREATE POLICY "bids_no_delete" ON bids FOR DELETE USING (false)';
  END IF;
END $$;

-- ============================================================
-- COMPLETIONS
-- ============================================================
CREATE POLICY "completions_select" ON completions FOR SELECT USING (true);
CREATE POLICY "completions_insert" ON completions FOR INSERT WITH CHECK (true);
CREATE POLICY "completions_no_update" ON completions FOR UPDATE USING (false);
CREATE POLICY "completions_no_delete" ON completions FOR DELETE USING (false);

-- ============================================================
-- REPUTATION EVENTS
-- ============================================================
CREATE POLICY "rep_events_select" ON reputation_events FOR SELECT USING (true);
CREATE POLICY "rep_events_insert" ON reputation_events FOR INSERT WITH CHECK (true);
CREATE POLICY "rep_events_no_update" ON reputation_events FOR UPDATE USING (false);
CREATE POLICY "rep_events_no_delete" ON reputation_events FOR DELETE USING (false);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE POLICY "disputes_select" ON disputes FOR SELECT USING (true);
CREATE POLICY "disputes_insert" ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "disputes_update" ON disputes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "disputes_no_delete" ON disputes FOR DELETE USING (false);

-- ============================================================
-- DELIVERABLES (if exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverables' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "deliverables_select" ON deliverables FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "deliverables_update" ON deliverables FOR UPDATE USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "deliverables_no_delete" ON deliverables FOR DELETE USING (false)';
  END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- Already has RLS from 002, but let's ensure public read works
-- (the app doesn't use Supabase Auth, so auth.uid() policies won't work)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notifications_no_delete" ON notifications FOR DELETE USING (false);

-- ============================================================
-- WALLET PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view wallet profiles" ON wallet_profiles;
DROP POLICY IF EXISTS "Users can update own wallet profile" ON wallet_profiles;
CREATE POLICY "wallet_profiles_select" ON wallet_profiles FOR SELECT USING (true);
CREATE POLICY "wallet_profiles_insert" ON wallet_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "wallet_profiles_update" ON wallet_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "wallet_profiles_no_delete" ON wallet_profiles FOR DELETE USING (false);

-- ============================================================
-- TRANSACTIONS (if exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "transactions_no_update" ON transactions FOR UPDATE USING (false)';
    EXECUTE 'CREATE POLICY "transactions_no_delete" ON transactions FOR DELETE USING (false)';
  END IF;
END $$;
