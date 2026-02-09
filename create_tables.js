const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thjialaevqwyiyyhbdxk.supabase.co',
  '***REMOVED***'
)

async function createTables() {
  console.log('Creating missing tables...')
  
  // Create notifications table
  const notificationsSQL = `
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
  `
  
  const { error: notifError } = await supabase.rpc('exec', { sql: notificationsSQL })
  if (notifError && !notifError.message.includes('already exists')) {
    console.error('Error creating notifications table:', notifError)
  } else {
    console.log('✅ Notifications table created/exists')
  }
  
  // Create wallet_profiles table
  const walletProfilesSQL = `
    CREATE TABLE IF NOT EXISTS wallet_profiles (
      address      TEXT PRIMARY KEY,
      display_name TEXT,
      joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  
  const { error: profileError } = await supabase.rpc('exec', { sql: walletProfilesSQL })
  if (profileError && !profileError.message.includes('already exists')) {
    console.error('Error creating wallet_profiles table:', profileError)
  } else {
    console.log('✅ Wallet profiles table created/exists')
  }
  
  // Test the tables exist by trying to query them
  const { error: testNotif } = await supabase.from('notifications').select('count').limit(1).single()
  const { error: testProfiles } = await supabase.from('wallet_profiles').select('count').limit(1).single()
  
  if (!testNotif || testNotif.code === 'PGRST116') {
    console.log('✅ Notifications table is accessible')
  } else {
    console.error('❌ Notifications table error:', testNotif)
  }
  
  if (!testProfiles || testProfiles.code === 'PGRST116') {
    console.log('✅ Wallet profiles table is accessible')
  } else {
    console.error('❌ Wallet profiles table error:', testProfiles)
  }
}

createTables().catch(console.error)