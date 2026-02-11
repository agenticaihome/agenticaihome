-- Migration: 014_lockdown_rls
-- Description: Lock down INSERT/UPDATE policies to require service_role.
-- All writes must go through Edge Functions (which use the service role key).
-- SELECT remains public for marketplace reads.
-- Date: 2026-02-11

-- ============================================================
-- Helper: Drop all existing INSERT/UPDATE policies, recreate as service_role only
-- ============================================================

-- AGENTS
DROP POLICY IF EXISTS "agents_insert" ON agents;
DROP POLICY IF EXISTS "agents_update" ON agents;
CREATE POLICY "agents_insert_service_only" ON agents FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "agents_update_service_only" ON agents FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- TASKS
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_insert_service_only" ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "tasks_update_service_only" ON tasks FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- TASK_BIDS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_bids' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "task_bids_insert" ON task_bids';
    EXECUTE 'DROP POLICY IF EXISTS "task_bids_no_update" ON task_bids';
    EXECUTE 'CREATE POLICY "task_bids_insert_service_only" ON task_bids FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "task_bids_update_service_only" ON task_bids FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- BIDS (alternate table name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bids' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "bids_insert" ON bids';
    EXECUTE 'DROP POLICY IF EXISTS "bids_no_update" ON bids';
    EXECUTE 'CREATE POLICY "bids_insert_service_only" ON bids FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "bids_update_service_only" ON bids FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- COMPLETIONS
DROP POLICY IF EXISTS "completions_insert" ON completions;
DROP POLICY IF EXISTS "completions_no_update" ON completions;
CREATE POLICY "completions_insert_service_only" ON completions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "completions_update_service_only" ON completions FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- REPUTATION_EVENTS
DROP POLICY IF EXISTS "rep_events_insert" ON reputation_events;
DROP POLICY IF EXISTS "rep_events_no_update" ON reputation_events;
CREATE POLICY "rep_events_insert_service_only" ON reputation_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rep_events_update_service_only" ON reputation_events FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- DISPUTES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disputes' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "disputes_insert" ON disputes';
    EXECUTE 'DROP POLICY IF EXISTS "disputes_update" ON disputes';
    EXECUTE 'CREATE POLICY "disputes_insert_service_only" ON disputes FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "disputes_update_service_only" ON disputes FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- DELIVERABLES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverables' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "deliverables_insert" ON deliverables';
    EXECUTE 'DROP POLICY IF EXISTS "deliverables_update" ON deliverables';
    EXECUTE 'CREATE POLICY "deliverables_insert_service_only" ON deliverables FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "deliverables_update_service_only" ON deliverables FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_insert_service_only" ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notifications_update_service_only" ON notifications FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- WALLET_PROFILES
DROP POLICY IF EXISTS "wallet_profiles_insert" ON wallet_profiles;
DROP POLICY IF EXISTS "wallet_profiles_update" ON wallet_profiles;
CREATE POLICY "wallet_profiles_insert_service_only" ON wallet_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "wallet_profiles_update_service_only" ON wallet_profiles FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- TRANSACTIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "transactions_insert" ON transactions';
    EXECUTE 'DROP POLICY IF EXISTS "transactions_no_update" ON transactions';
    EXECUTE 'CREATE POLICY "transactions_insert_service_only" ON transactions FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "transactions_update_service_only" ON transactions FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- RATINGS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ratings' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "ratings_insert" ON ratings';
    EXECUTE 'DROP POLICY IF EXISTS "ratings_update" ON ratings';
    EXECUTE 'CREATE POLICY "ratings_insert_service_only" ON ratings FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "ratings_update_service_only" ON ratings FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- SUBSCRIBERS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscribers' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "subscribers_insert" ON subscribers';
    EXECUTE 'DROP POLICY IF EXISTS "subscribers_update" ON subscribers';
    EXECUTE 'CREATE POLICY "subscribers_insert_service_only" ON subscribers FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "subscribers_update_service_only" ON subscribers FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- ERGOPAY_REQUESTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ergopay_requests' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "ergopay_requests_insert" ON ergopay_requests';
    EXECUTE 'DROP POLICY IF EXISTS "ergopay_requests_update" ON ergopay_requests';
    EXECUTE 'CREATE POLICY "ergopay_requests_insert_service_only" ON ergopay_requests FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    EXECUTE 'CREATE POLICY "ergopay_requests_update_service_only" ON ergopay_requests FOR UPDATE USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- NOTE: SELECT policies remain unchanged (public reads are fine for a marketplace).
-- All state-changing operations must now go through Edge Functions using the service_role key.
