-- Add milestone escrow support to tasks table
-- Migration: 012_milestone_escrow_support
-- Description: Adds columns for milestone escrow functionality

-- Add milestone-specific columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS escrow_type TEXT DEFAULT 'simple' CHECK (escrow_type IN ('simple', 'milestone')),
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_milestone INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_milestones JSONB DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_escrow_type ON tasks(escrow_type);
CREATE INDEX IF NOT EXISTS idx_tasks_current_milestone ON tasks(current_milestone);

-- Add comments for documentation
COMMENT ON COLUMN tasks.escrow_type IS 'Type of escrow: simple (one payment) or milestone (staged payments)';
COMMENT ON COLUMN tasks.milestones IS 'Array of milestone objects with name, description, percentage, deliverables, deadlineHeight';
COMMENT ON COLUMN tasks.current_milestone IS '0-based index of current milestone being worked on';
COMMENT ON COLUMN tasks.completed_milestones IS 'Array of completed milestone info with txId, releasedAmount, completedAt';

-- Update existing tasks to have explicit escrow_type
UPDATE tasks SET escrow_type = 'simple' WHERE escrow_type IS NULL;