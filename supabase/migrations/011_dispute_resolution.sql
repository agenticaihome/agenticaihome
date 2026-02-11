-- Dispute Resolution Enhancement
-- Migration 011: Add multi-sig dispute resolution capabilities

-- Add mediator support to existing disputes table
DO $$
BEGIN
    -- Add mediator_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'mediator_address') THEN
        ALTER TABLE disputes ADD COLUMN mediator_address TEXT;
    END IF;
    
    -- Add resolution_tx column for storing partial signatures
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disputes' AND column_name = 'resolution_tx') THEN
        ALTER TABLE disputes ADD COLUMN resolution_tx JSONB;
    END IF;
END
$$;

-- Add escrow_type support to tasks table
DO $$
BEGIN
    -- Add escrow_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'escrow_type') THEN
        ALTER TABLE tasks ADD COLUMN escrow_type TEXT DEFAULT 'simple' CHECK (escrow_type IN ('simple', 'multisig'));
    END IF;
END
$$;

-- Create dispute_evidence table for off-chain evidence submission
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    submitter_address TEXT NOT NULL,
    submitter_role TEXT NOT NULL CHECK (submitter_role IN ('creator', 'agent')),
    evidence_text TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create dispute_status table for current DisputePanel compatibility
CREATE TABLE IF NOT EXISTS dispute_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
    status TEXT NOT NULL DEFAULT 'disputed' CHECK (status IN ('disputed', 'evidence_submitted', 'under_review', 'resolved')),
    resolved_in_favor_of TEXT CHECK (resolved_in_favor_of IN ('creator', 'agent')),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_task_id ON dispute_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_submitter ON dispute_evidence(submitter_address);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_created_at ON dispute_evidence(created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_status_task_id ON dispute_status(task_id);
CREATE INDEX IF NOT EXISTS idx_dispute_status_status ON dispute_status(status);

CREATE INDEX IF NOT EXISTS idx_disputes_mediator_address ON disputes(mediator_address);
CREATE INDEX IF NOT EXISTS idx_tasks_escrow_type ON tasks(escrow_type);

-- Add trigger for updated_at on dispute_status table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dispute_status_updated_at ON dispute_status;
CREATE TRIGGER update_dispute_status_updated_at
    BEFORE UPDATE ON dispute_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispute_evidence table

-- Allow anyone to read evidence for transparency
CREATE POLICY "dispute_evidence_select_policy" ON dispute_evidence
    FOR SELECT USING (true);

-- Allow task participants to submit evidence
CREATE POLICY "dispute_evidence_insert_policy" ON dispute_evidence
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            submitter_address = auth.uid()::text
        )
    );

-- Allow service role to manage evidence
CREATE POLICY "dispute_evidence_service_role_policy" ON dispute_evidence
    FOR ALL 
    USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    );

-- RLS Policies for dispute_status table

-- Allow anyone to read status for transparency
CREATE POLICY "dispute_status_select_policy" ON dispute_status
    FOR SELECT USING (true);

-- Allow task participants to create/update status
CREATE POLICY "dispute_status_insert_policy" ON dispute_status
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "dispute_status_update_policy" ON dispute_status
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL
    );

-- Allow service role to manage status
CREATE POLICY "dispute_status_service_role_policy" ON dispute_status
    FOR ALL 
    USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    );

-- Create function to get multi-sig dispute info
CREATE OR REPLACE FUNCTION get_multisig_dispute_info(task_uuid UUID)
RETURNS TABLE (
    uses_multisig BOOLEAN,
    mediator_address TEXT,
    dispute_status TEXT,
    resolution_ready BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(t.escrow_type = 'multisig', false) as uses_multisig,
        d.mediator_address,
        ds.status as dispute_status,
        (ds.status = 'under_review' AND d.resolution_tx IS NOT NULL) as resolution_ready
    FROM tasks t
    LEFT JOIN disputes d ON d.task_id = t.id
    LEFT JOIN dispute_status ds ON ds.task_id = t.id
    WHERE t.id = task_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_multisig_dispute_info TO authenticated, anon;

COMMENT ON TABLE dispute_evidence IS 'Off-chain evidence submissions for disputes';
COMMENT ON TABLE dispute_status IS 'Current dispute status tracking for DisputePanel compatibility';
COMMENT ON FUNCTION get_multisig_dispute_info IS 'Function to get multi-sig dispute information for a specific task';