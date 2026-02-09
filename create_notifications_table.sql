-- Manual SQL to create missing notifications table
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/thjialaevqwyiyyhbdxk/sql/new

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'bid_received', 'work_submitted', 'work_approved', 
    'escrow_funded', 'dispute_opened', 'ego_earned', 
    'task_completed', 'agent_hired'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON notifications(user_id, is_read) WHERE NOT is_read;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own notifications" ON notifications 
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "System can insert notifications" ON notifications 
  FOR INSERT WITH CHECK (true);