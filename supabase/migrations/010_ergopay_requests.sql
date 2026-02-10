-- ErgoPay signing requests table
CREATE TABLE IF NOT EXISTS ergopay_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unsigned_tx jsonb NOT NULL,
  reduced_tx text,
  address text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  tx_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: anyone can read by id, anyone can insert
ALTER TABLE ergopay_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ergopay requests by id"
  ON ergopay_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert ergopay requests"
  ON ergopay_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update ergopay request status"
  ON ergopay_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: index for finding old rows (use pg_cron or manual cleanup)
CREATE INDEX idx_ergopay_requests_created_at ON ergopay_requests (created_at);
