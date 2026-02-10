-- Fix subscribers table RLS policy to allow public newsletter signup
-- Run this in Supabase SQL editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "subscribers_insert_policy" ON subscribers;
DROP POLICY IF EXISTS "subscribers_select_policy" ON subscribers;
DROP POLICY IF EXISTS "public_select_subscribers" ON subscribers;
DROP POLICY IF EXISTS "public_insert_subscribers" ON subscribers;

-- Create policy that allows anyone to insert (for newsletter signup)
CREATE POLICY "public_insert_subscribers" ON subscribers 
FOR INSERT 
WITH CHECK (true);

-- Prevent public reading of subscriber list (privacy)
CREATE POLICY "no_public_select_subscribers" ON subscribers 
FOR SELECT 
USING (false);

-- Allow service role to manage subscribers
CREATE POLICY "service_role_all_subscribers" ON subscribers 
FOR ALL 
USING (true)
WITH CHECK (true);