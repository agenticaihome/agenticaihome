-- Add missing tables for notifications and wallet_profiles
-- Migration: 002_add_missing_tables
-- Description: Add notifications and wallet_profiles tables expected by the application

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL 
                CHECK (type IN ('bid_received', 'work_submitted', 'work_approved', 'escrow_funded', 'dispute_opened', 'ego_earned', 'task_completed', 'agent_hired')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- ============================================================
-- WALLET_PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_profiles (
  address      TEXT PRIMARY KEY,
  display_name TEXT,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_profiles_joined_at ON wallet_profiles(joined_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_profiles ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications 
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

-- Wallet profiles: Anyone can view, but only owners can update
CREATE POLICY "Anyone can view wallet profiles" ON wallet_profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can update own wallet profile" ON wallet_profiles 
  FOR ALL USING (auth.uid()::TEXT = address OR auth.uid() IS NULL);