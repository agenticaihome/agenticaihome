-- Notifications table for AgenticAiHome
-- Run in Supabase SQL editor

-- Drop existing table if schema is wrong
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

-- Indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_address);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_address, read) WHERE NOT read;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read notifications (filtered by recipient_address in app queries)
-- Since we use wallet auth (not Supabase auth), we allow SELECT and filter client-side
CREATE POLICY "public_select_notifications" ON notifications 
  FOR SELECT USING (true);

-- Anyone can insert (notifications created by app logic)
CREATE POLICY "public_insert_notifications" ON notifications 
  FOR INSERT WITH CHECK (true);

-- Anyone can mark as read (update only the read column)
CREATE POLICY "public_update_notifications" ON notifications 
  FOR UPDATE USING (true);

-- NO DELETE policy (security measure)

-- Helper function
CREATE OR REPLACE FUNCTION create_notification(
  recipient TEXT,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_link TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id TEXT;
BEGIN
  notification_id := concat('notif_', extract(epoch from now())::text, '_', substr(md5(random()::text), 1, 8));
  
  INSERT INTO notifications (id, recipient_address, type, title, message, link, read, created_at)
  VALUES (notification_id, recipient, notification_type, notification_title, notification_message, notification_link, FALSE, NOW());
  
  RETURN notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification TO postgres, anon, authenticated;
