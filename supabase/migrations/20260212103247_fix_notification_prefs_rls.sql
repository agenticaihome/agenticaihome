-- Fix: notification_preferences was readable by anon key, leaking Telegram chat IDs
-- Only service_role (edge functions) should access this table

DROP POLICY IF EXISTS "Enable read access for all users" ON notification_preferences;
DROP POLICY IF EXISTS "Enable insert for all users" ON notification_preferences;
DROP POLICY IF EXISTS "Enable update for all users" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_anon_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_anon_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_anon_update" ON notification_preferences;

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (edge functions use service_role internally)
CREATE POLICY "service_role_full_access" ON notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);
