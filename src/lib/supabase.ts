import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://thjialaevqwyiyyhbdxk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoamlhbGFldnF3eWl5eWhiZHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTY4OTgsImV4cCI6MjA4NjE3Mjg5OH0.zaf6bV4LL6N0oMVgQS1tmwLbdXSG7fFc-3RS7LjrcOo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
