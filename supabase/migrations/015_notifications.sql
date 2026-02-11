-- Migration: 015_notifications
-- Description: Fix notifications table schema to match client code, add notification_preferences, add rating_received type
-- Date: 2026-02-11

-- ============================================================
-- FIX NOTIFICATIONS TABLE: align columns with client code
-- Client uses: recipient_address, type, title, message, link, read, created_at
-- DB has: user_id, type, title, message, action_url, is_read, data, created_at
-- ============================================================

-- Drop the type constraint so we can add new notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new columns that client code expects
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_address TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate data from old columns to new
UPDATE notifications SET recipient_address = user_id WHERE recipient_address IS NULL;
UPDATE notifications SET link = action_url WHERE link IS NULL AND action_url IS NOT NULL;
UPDATE notifications SET read = is_read;

-- Make recipient_address not null after migration
ALTER TABLE notifications ALTER COLUMN recipient_address SET NOT NULL;

-- Add expanded type constraint
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check_v2
  CHECK (type IN (
    'bid_received', 'bid_accepted',
    'work_submitted', 'work_approved',
    'deliverable_submitted',
    'escrow_funded', 'task_funded',
    'payment_released',
    'dispute_opened',
    'ego_earned',
    'task_completed',
    'agent_hired',
    'rating_received'
  ));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_address);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_v2 ON notifications(recipient_address, read) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_address, created_at DESC);

-- ============================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_address  TEXT NOT NULL UNIQUE,
  -- Telegram integration
  telegram_chat_id    TEXT,
  telegram_username   TEXT,
  telegram_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_verify_code TEXT,
  -- Preference levels
  in_app_level    TEXT NOT NULL DEFAULT 'all' CHECK (in_app_level IN ('all', 'important', 'none')),
  telegram_level  TEXT NOT NULL DEFAULT 'important' CHECK (telegram_level IN ('all', 'important', 'none')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_wallet ON notification_preferences(wallet_address);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_telegram ON notification_preferences(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT USING (true);
CREATE POLICY "notif_prefs_insert_service_only" ON notification_preferences FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notif_prefs_update_service_only" ON notification_preferences FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
