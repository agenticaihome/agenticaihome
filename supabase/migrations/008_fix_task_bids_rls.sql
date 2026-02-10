-- Also fix task_bids if it exists (003 created policies on both)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_bids' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "task_bids_no_update" ON task_bids';
    EXECUTE 'CREATE POLICY "task_bids_update" ON task_bids FOR UPDATE USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Ensure the migration tracking table exists and mark old migrations as applied
INSERT INTO supabase_migrations.schema_migrations (version, statements) VALUES
  ('001_initial_schema', '{}'),
  ('002_add_missing_tables', '{}'),
  ('003_security_rls', '{}'),
  ('004_challenges_table', '{}'),
  ('005_task_lifecycle', '{}'),
  ('006_dispute_system', '{}')
ON CONFLICT DO NOTHING;
