-- Dispute System Tables
-- Migration 006: Add dispute resolution system tables

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mediation', 'resolved', 'refunded', 'expired')),
    poster_address TEXT NOT NULL,
    agent_address TEXT NOT NULL,
    original_amount BIGINT NOT NULL DEFAULT 0, -- amount in nanoERG
    proposed_poster_percent INTEGER,
    proposed_agent_percent INTEGER,
    mediation_deadline INTEGER NOT NULL, -- block height
    dispute_box_id TEXT, -- on-chain dispute box ID
    resolution_tx_id TEXT, -- final resolution transaction ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create dispute_resolutions table for tracking proposed splits
CREATE TABLE IF NOT EXISTS dispute_resolutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    poster_percent INTEGER NOT NULL CHECK (poster_percent >= 0 AND poster_percent <= 100),
    agent_percent INTEGER NOT NULL CHECK (agent_percent >= 0 AND agent_percent <= 100),
    proposed_by TEXT NOT NULL, -- ergo address of proposer
    accepted_by TEXT, -- ergo address of acceptor (null = pending)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT valid_percentage_sum CHECK (poster_percent + agent_percent = 100)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_poster_address ON disputes(poster_address);
CREATE INDEX IF NOT EXISTS idx_disputes_agent_address ON disputes(agent_address);
CREATE INDEX IF NOT EXISTS idx_disputes_mediation_deadline ON disputes(mediation_deadline);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_dispute_id ON dispute_resolutions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_proposed_by ON dispute_resolutions(proposed_by);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_accepted_by ON dispute_resolutions(accepted_by);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_created_at ON dispute_resolutions(created_at);

-- Add composite index for finding active resolutions
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_active 
ON dispute_resolutions(dispute_id, created_at) 
WHERE accepted_by IS NULL;

-- Add trigger for updated_at on disputes table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes table

-- Allow anyone to read disputes for transparency
CREATE POLICY "disputes_select_policy" ON disputes
    FOR SELECT USING (true);

-- Allow poster or agent to create disputes
CREATE POLICY "disputes_insert_policy" ON disputes
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            poster_address = auth.uid()::text OR 
            agent_address = auth.uid()::text
        )
    );

-- Allow poster or agent to update their disputes
CREATE POLICY "disputes_update_policy" ON disputes
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL AND (
            poster_address = auth.uid()::text OR 
            agent_address = auth.uid()::text
        )
    );

-- Allow service role to manage disputes
CREATE POLICY "disputes_service_role_policy" ON disputes
    FOR ALL 
    USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    );

-- RLS Policies for dispute_resolutions table

-- Allow anyone to read resolutions for transparency
CREATE POLICY "dispute_resolutions_select_policy" ON dispute_resolutions
    FOR SELECT USING (true);

-- Allow poster or agent to create resolution proposals
CREATE POLICY "dispute_resolutions_insert_policy" ON dispute_resolutions
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM disputes 
            WHERE id = dispute_id AND (
                poster_address = auth.uid()::text OR 
                agent_address = auth.uid()::text
            )
        )
    );

-- Allow poster or agent to update (accept) resolutions
CREATE POLICY "dispute_resolutions_update_policy" ON dispute_resolutions
    FOR UPDATE 
    USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM disputes 
            WHERE id = dispute_id AND (
                poster_address = auth.uid()::text OR 
                agent_address = auth.uid()::text
            )
        )
    );

-- Allow service role to manage dispute resolutions
CREATE POLICY "dispute_resolutions_service_role_policy" ON dispute_resolutions
    FOR ALL 
    USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    );

-- Add dispute count to agents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'disputes_won') THEN
        ALTER TABLE agents ADD COLUMN disputes_won INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'disputes_lost') THEN
        ALTER TABLE agents ADD COLUMN disputes_lost INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'consecutive_disputes_lost') THEN
        ALTER TABLE agents ADD COLUMN consecutive_disputes_lost INTEGER DEFAULT 0;
    END IF;
END
$$;

-- Function to update agent dispute statistics
CREATE OR REPLACE FUNCTION update_agent_dispute_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when dispute status changes to 'resolved'
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        -- Get the accepted resolution
        WITH accepted_resolution AS (
            SELECT poster_percent, agent_percent
            FROM dispute_resolutions
            WHERE dispute_id = NEW.id 
            AND accepted_by IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        )
        -- Update agent stats based on resolution outcome
        UPDATE agents 
        SET 
            disputes_won = CASE 
                WHEN ar.agent_percent >= 50 THEN disputes_won + 1 
                ELSE disputes_won 
            END,
            disputes_lost = CASE 
                WHEN ar.agent_percent < 50 THEN disputes_lost + 1 
                ELSE disputes_lost 
            END,
            consecutive_disputes_lost = CASE 
                WHEN ar.agent_percent < 50 THEN consecutive_disputes_lost + 1 
                ELSE 0 
            END
        FROM accepted_resolution ar
        WHERE agents.ergo_address = NEW.agent_address;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agent dispute stats
DROP TRIGGER IF EXISTS update_agent_dispute_stats_trigger ON disputes;
CREATE TRIGGER update_agent_dispute_stats_trigger
    AFTER UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_dispute_stats();

-- Create a view for dispute statistics
CREATE OR REPLACE VIEW dispute_stats AS
SELECT 
    d.id,
    d.task_id,
    d.status,
    d.poster_address,
    d.agent_address,
    d.original_amount,
    d.mediation_deadline,
    d.created_at,
    d.updated_at,
    COALESCE(ar.poster_percent, d.proposed_poster_percent) as final_poster_percent,
    COALESCE(ar.agent_percent, d.proposed_agent_percent) as final_agent_percent,
    ar.accepted_by as resolution_accepted_by,
    CASE 
        WHEN d.status = 'resolved' AND ar.agent_percent >= 50 THEN 'agent_won'
        WHEN d.status = 'resolved' AND ar.agent_percent < 50 THEN 'poster_won'
        WHEN d.status = 'refunded' THEN 'poster_won'
        ELSE 'pending'
    END as outcome
FROM disputes d
LEFT JOIN LATERAL (
    SELECT poster_percent, agent_percent, accepted_by
    FROM dispute_resolutions
    WHERE dispute_id = d.id 
    AND accepted_by IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
) ar ON true;

-- Grant access to views
GRANT SELECT ON dispute_stats TO authenticated, anon;

-- Create function to get dispute summary for tasks
CREATE OR REPLACE FUNCTION get_task_dispute_summary(task_uuid UUID)
RETURNS TABLE (
    has_dispute BOOLEAN,
    dispute_status TEXT,
    blocks_until_expiry INTEGER,
    proposed_poster_percent INTEGER,
    proposed_agent_percent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM disputes WHERE task_id = task_uuid) as has_dispute,
        d.status as dispute_status,
        GREATEST(0, d.mediation_deadline - (SELECT COALESCE(
            (SELECT value::integer FROM public.settings WHERE key = 'current_height'),
            800000 -- fallback height
        ))) as blocks_until_expiry,
        d.proposed_poster_percent,
        d.proposed_agent_percent
    FROM disputes d
    WHERE d.task_id = task_uuid
    ORDER BY d.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_task_dispute_summary TO authenticated, anon;

COMMENT ON TABLE disputes IS 'Table storing dispute records for tasks in review that are contested';
COMMENT ON TABLE dispute_resolutions IS 'Table storing proposed and accepted resolution splits for disputes';
COMMENT ON VIEW dispute_stats IS 'Aggregated view of dispute outcomes and statistics';
COMMENT ON FUNCTION get_task_dispute_summary IS 'Function to get dispute summary information for a specific task';