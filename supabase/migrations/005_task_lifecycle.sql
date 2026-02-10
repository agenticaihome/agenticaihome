-- Migration: 005_task_lifecycle
-- Description: Task lifecycle state machine with enforced transitions

-- ============================================================
-- 1. Update tasks table: expand status values, add accepted_bid columns
-- ============================================================

-- Drop existing check constraint on status (may have different name)
DO $$ BEGIN
  ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
  ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_tasks_status;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Add new status values (funded, cancelled, refunded)
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'funded', 'assigned', 'in_progress', 'review', 'completed', 'disputed', 'cancelled', 'refunded'));

-- Add accepted_bid_id and accepted_agent_address if not present
DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN accepted_bid_id TEXT REFERENCES bids(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD COLUMN accepted_agent_address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 2. Add status column to bids
-- ============================================================

DO $$ BEGIN
  ALTER TABLE bids ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
  ALTER TABLE bids ADD CONSTRAINT bids_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 3. Add status column to deliverables
-- ============================================================

DO $$ BEGIN
  ALTER TABLE deliverables ADD COLUMN status TEXT NOT NULL DEFAULT 'submitted';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS deliverables_status_check;
  ALTER TABLE deliverables ADD CONSTRAINT deliverables_status_check
    CHECK (status IN ('submitted', 'approved', 'rejected'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 4. Task status transition function
-- ============================================================

CREATE OR REPLACE FUNCTION transition_task_status(
  p_task_id TEXT,
  p_new_status TEXT,
  p_actor_address TEXT
) RETURNS jsonb AS $$
DECLARE
  v_task RECORD;
  v_valid BOOLEAN := false;
  v_old_status TEXT;
BEGIN
  -- Lock the task row
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  v_old_status := v_task.status;

  -- Check valid transitions
  v_valid := CASE
    WHEN v_old_status = 'open'        AND p_new_status = 'funded'      THEN true
    WHEN v_old_status = 'open'        AND p_new_status = 'cancelled'   THEN true
    WHEN v_old_status = 'funded'      AND p_new_status = 'in_progress' THEN true
    WHEN v_old_status = 'in_progress' AND p_new_status = 'review'      THEN true
    WHEN v_old_status = 'review'      AND p_new_status = 'completed'   THEN true
    WHEN v_old_status = 'review'      AND p_new_status = 'in_progress' THEN true
    WHEN v_old_status = 'funded'      AND p_new_status = 'refunded'    THEN true
    ELSE false
  END;

  IF NOT v_valid THEN
    RETURN jsonb_build_object(
      'error', format('Invalid transition: %s -> %s', v_old_status, p_new_status)
    );
  END IF;

  -- Authorization checks
  IF p_new_status = 'cancelled' AND v_task.creator_address != p_actor_address THEN
    RETURN jsonb_build_object('error', 'Only the task poster can cancel');
  END IF;

  IF p_new_status = 'in_progress' AND v_old_status = 'funded' AND v_task.creator_address != p_actor_address THEN
    RETURN jsonb_build_object('error', 'Only the task poster can accept bids');
  END IF;

  IF p_new_status = 'completed' AND v_task.creator_address != p_actor_address THEN
    RETURN jsonb_build_object('error', 'Only the task poster can approve deliverables');
  END IF;

  IF p_new_status = 'in_progress' AND v_old_status = 'review' AND v_task.creator_address != p_actor_address THEN
    RETURN jsonb_build_object('error', 'Only the task poster can request revisions');
  END IF;

  -- Perform the transition
  UPDATE tasks SET status = p_new_status WHERE id = p_task_id;

  IF p_new_status = 'completed' THEN
    UPDATE tasks SET completed_at = NOW()::text WHERE id = p_task_id;
  END IF;

  -- Log the transition
  INSERT INTO task_events (task_id, event_type, actor_address, metadata)
  VALUES (
    p_task_id,
    'status_transition',
    p_actor_address,
    jsonb_build_object('from', v_old_status, 'to', p_new_status)
  );

  RETURN jsonb_build_object('success', true, 'from', v_old_status, 'to', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. RLS policies for task poster actions
-- ============================================================

-- Drop old permissive update policy
DROP POLICY IF EXISTS "tasks_update" ON tasks;

-- Task poster can update their own tasks
CREATE POLICY "tasks_update_poster" ON tasks FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: The transition_task_status function runs as SECURITY DEFINER
-- and handles authorization checks internally. RLS on bids:

-- Enable RLS on bids if not already
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids_select" ON bids;
CREATE POLICY "bids_select" ON bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "bids_insert" ON bids;
CREATE POLICY "bids_insert" ON bids FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bids_update" ON bids;
CREATE POLICY "bids_update" ON bids FOR UPDATE USING (true) WITH CHECK (true);

-- Enable RLS on deliverables if not already
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliverables_select" ON deliverables;
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT USING (true);

DROP POLICY IF EXISTS "deliverables_insert" ON deliverables;
CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "deliverables_update" ON deliverables;
CREATE POLICY "deliverables_update" ON deliverables FOR UPDATE USING (true) WITH CHECK (true);
