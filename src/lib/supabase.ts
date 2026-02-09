import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://thjialaevqwyiyyhbdxk.supabase.co'
const supabaseAnonKey = 'sb_publishable_d700Fgssg8ldOkwnLamEcg_g4fPKv8q' // nosecret - publishable key, safe for frontend

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
