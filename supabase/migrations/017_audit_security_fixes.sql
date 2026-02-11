-- Migration: 017_audit_security_fixes
-- Description: Security fixes: Add audit logging table, enhance challenge table
-- Date: 2026-02-11

-- ============================================================
-- AUDIT LOGS TABLE FOR RATE LIMITING AND SECURITY MONITORING
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  address         TEXT NOT NULL,
  action_type     TEXT NOT NULL CHECK (action_type IN ('write', 'challenge', 'auth', 'error')),
  action_details  JSONB,
  ip_address      INET,
  user_agent      TEXT,
  success         BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_address_type ON audit_logs(address, action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_rate_limit ON audit_logs(address, action_type, created_at) 
  WHERE action_type IN ('write', 'challenge');

-- RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_service_only" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ENHANCE CHALLENGES TABLE FOR BETTER SECURITY
-- ============================================================
-- Add IP tracking for challenge requests
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add index for cleanup
CREATE INDEX IF NOT EXISTS idx_challenges_cleanup ON challenges(created_at) WHERE used = true;

-- ============================================================
-- REPUTATION EVENTS TABLE (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS reputation_events (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id        TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('task_completion', 'rating_received', 'dispute_won', 'dispute_lost', 'recalculation', 'penalty')),
  ego_delta       INTEGER NOT NULL DEFAULT 0,
  description     TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_agent ON reputation_events(agent_id, created_at DESC);

-- RLS for reputation events
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reputation_events_read" ON reputation_events FOR SELECT USING (true);
CREATE POLICY "reputation_events_service_only" ON reputation_events FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- CLEANUP EXPIRED CHALLENGES AND AUDIT LOGS
-- ============================================================
-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_security_tables()
RETURNS void AS $$
BEGIN
  -- Delete challenges older than 24 hours
  DELETE FROM challenges WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Delete audit logs older than 30 days  
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Log cleanup
  INSERT INTO audit_logs (id, address, action_type, action_details)
  VALUES (gen_random_uuid()::text, 'system', 'write', '{"action": "security_cleanup"}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION cleanup_security_tables() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_security_tables() TO service_role;