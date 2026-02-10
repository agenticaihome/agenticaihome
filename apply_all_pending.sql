-- ============================================================
-- AgenticAiHome: All Pending SQL (run in Supabase SQL Editor)
-- ============================================================

-- ============================================================
-- PART 1: Notifications table
-- ============================================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT concat('notif_', extract(epoch from now())::text, '_', substr(md5(random()::text), 1, 8)),
  recipient_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'task_funded', 'bid_received', 'bid_accepted', 
    'deliverable_submitted', 'payment_released',
    'work_submitted', 'work_approved', 'escrow_funded', 
    'dispute_opened', 'ego_earned', 'task_completed', 'agent_hired'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_address);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_address, read) WHERE NOT read;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE USING (true);
-- NO DELETE policy

CREATE OR REPLACE FUNCTION create_notification(
  recipient TEXT,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_link TEXT DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE notification_id TEXT;
BEGIN
  notification_id := concat('notif_', extract(epoch from now())::text, '_', substr(md5(random()::text), 1, 8));
  INSERT INTO notifications (id, recipient_address, type, title, message, link, read, created_at)
  VALUES (notification_id, recipient, notification_type, notification_title, notification_message, notification_link, FALSE, NOW());
  RETURN notification_id;
END; $$;

GRANT EXECUTE ON FUNCTION create_notification TO postgres, anon, authenticated;

-- ============================================================
-- PART 2: Subscribers RLS fix
-- ============================================================

DROP POLICY IF EXISTS "subscribers_insert_policy" ON subscribers;
DROP POLICY IF EXISTS "subscribers_select_policy" ON subscribers;
DROP POLICY IF EXISTS "public_select_subscribers" ON subscribers;
DROP POLICY IF EXISTS "public_insert_subscribers" ON subscribers;
DROP POLICY IF EXISTS "no_public_select_subscribers" ON subscribers;
DROP POLICY IF EXISTS "service_role_all_subscribers" ON subscribers;

CREATE POLICY "public_insert_subscribers" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "no_public_select_subscribers" ON subscribers FOR SELECT USING (false);
-- NO DELETE policy

-- ============================================================
-- PART 3: Task lifecycle additions
-- ============================================================

-- task_events table (for audit log)
CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY DEFAULT concat('evt_', extract(epoch from now())::text, '_', substr(md5(random()::text), 1, 8)),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  event_type TEXT NOT NULL,
  actor_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at DESC);

ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_select_task_events" ON task_events FOR SELECT USING (true);
CREATE POLICY "public_insert_task_events" ON task_events FOR INSERT WITH CHECK (true);
-- NO DELETE, NO UPDATE

-- Expand task status values
DO $$ BEGIN
  ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
  ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_tasks_status;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'funded', 'assigned', 'in_progress', 'review', 'completed', 'disputed', 'cancelled', 'refunded'));

-- Add columns if missing
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN accepted_bid_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tasks ADD COLUMN accepted_agent_address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE bids ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE deliverables ADD COLUMN status TEXT NOT NULL DEFAULT 'submitted'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Bid status constraint
DO $$ BEGIN
  ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
  ALTER TABLE bids ADD CONSTRAINT bids_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Deliverable status constraint
DO $$ BEGIN
  ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS deliverables_status_check;
  ALTER TABLE deliverables ADD CONSTRAINT deliverables_status_check CHECK (status IN ('submitted', 'approved', 'rejected'));
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Task status transition function
CREATE OR REPLACE FUNCTION transition_task_status(
  p_task_id TEXT, p_new_status TEXT, p_actor_address TEXT
) RETURNS jsonb AS $$
DECLARE v_task RECORD; v_valid BOOLEAN := false; v_old_status TEXT;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Task not found'); END IF;
  v_old_status := v_task.status;

  v_valid := CASE
    WHEN v_old_status = 'open'        AND p_new_status = 'funded'      THEN true
    WHEN v_old_status = 'open'        AND p_new_status = 'in_progress' THEN true
    WHEN v_old_status = 'open'        AND p_new_status = 'cancelled'   THEN true
    WHEN v_old_status = 'funded'      AND p_new_status = 'in_progress' THEN true
    WHEN v_old_status = 'funded'      AND p_new_status = 'refunded'    THEN true
    WHEN v_old_status = 'in_progress' AND p_new_status = 'review'      THEN true
    WHEN v_old_status = 'review'      AND p_new_status = 'completed'   THEN true
    WHEN v_old_status = 'review'      AND p_new_status = 'in_progress' THEN true
    ELSE false
  END;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('error', format('Invalid transition: %s -> %s', v_old_status, p_new_status));
  END IF;

  UPDATE tasks SET status = p_new_status WHERE id = p_task_id;
  IF p_new_status = 'completed' THEN
    UPDATE tasks SET completed_at = NOW()::text WHERE id = p_task_id;
  END IF;

  INSERT INTO task_events (task_id, event_type, actor_address, metadata)
  VALUES (p_task_id, 'status_transition', p_actor_address, jsonb_build_object('from', v_old_status, 'to', p_new_status));

  RETURN jsonb_build_object('success', true, 'from', v_old_status, 'to', p_new_status);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION transition_task_status TO postgres, anon, authenticated;

-- ============================================================
-- PART 4: Performance indexes for scale
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_address);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_task_id ON bids(task_id);
CREATE INDEX IF NOT EXISTS idx_bids_agent ON bids(agent_address);
CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(ergo_address);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_address);
CREATE INDEX IF NOT EXISTS idx_transactions_task ON transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_task ON deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_agent ON reputation_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_challenges_address ON challenges(wallet_address);

-- ============================================================
-- DONE
-- ============================================================
SELECT 'All migrations applied successfully' as result;
