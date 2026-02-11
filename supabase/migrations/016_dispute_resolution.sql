-- Dispute Resolution Enhancement
-- Migration 016: Add dispute messages table and mediator improvements

-- Create dispute_messages table for threaded discussions
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    author_address TEXT NOT NULL,
    author_role TEXT NOT NULL CHECK (author_role IN ('client', 'agent', 'mediator')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);

-- Enable RLS
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Open read, authenticated write (matches existing pattern)
CREATE POLICY "dispute_messages_select_policy" ON dispute_messages
    FOR SELECT USING (true);

CREATE POLICY "dispute_messages_insert_policy" ON dispute_messages
    FOR INSERT WITH CHECK (true);

-- Add resolved_at to disputes if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'resolved_at') THEN
        ALTER TABLE disputes ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END
$$;

COMMENT ON TABLE dispute_messages IS 'Threaded discussion messages between dispute parties';
