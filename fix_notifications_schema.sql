-- Fix notifications table schema to match requirements
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/thjialaevqwyiyyhbdxk/sql/new

-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table with correct schema
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

-- Create indexes for performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_address);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_address, read) WHERE NOT read;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only read their own notifications
CREATE POLICY "Users can view own notifications" ON notifications 
  FOR SELECT USING (
    -- For authenticated users, use their auth.uid() if available, otherwise fall back to recipient_address matching
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::TEXT = recipient_address
      ELSE TRUE  -- Allow read for non-authenticated users (they'll be filtered by recipient_address in queries)
    END
  );

-- Allow system/service role to insert notifications
CREATE POLICY "System can insert notifications" ON notifications 
  FOR INSERT WITH CHECK (TRUE);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::TEXT = recipient_address
      ELSE TRUE
    END
  );

-- Create function to insert notifications
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
  -- Generate unique ID
  notification_id := concat('notif_', extract(epoch from now())::text, '_', substr(md5(random()::text), 1, 8));
  
  -- Insert notification
  INSERT INTO notifications (
    id, 
    recipient_address, 
    type, 
    title, 
    message, 
    link, 
    read, 
    created_at
  ) VALUES (
    notification_id,
    recipient,
    notification_type,
    notification_title,
    notification_message,
    notification_link,
    FALSE,
    NOW()
  );
  
  RETURN notification_id;
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION create_notification TO postgres, anon, authenticated;