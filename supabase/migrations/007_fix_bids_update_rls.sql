-- Fix: Allow bid status updates (needed for acceptBid workflow)
DROP POLICY IF EXISTS "bids_no_update" ON bids;
CREATE POLICY "bids_update" ON bids FOR UPDATE USING (true) WITH CHECK (true);
