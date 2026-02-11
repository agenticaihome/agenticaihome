-- Add milestone escrow support to tasks table
-- Migration: 012_milestone_escrow_support
-- Description: Adds milestone-specific columns (escrow_type already added in 011)

-- Add milestone-specific columns to tasks table (escrow_type handled by migration 011)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_milestone INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_milestones JSONB DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_current_milestone ON tasks(current_milestone);

-- Add comments for documentation
COMMENT ON COLUMN tasks.milestones IS 'Array of milestone objects with name, description, percentage, deliverables, deadlineHeight';
COMMENT ON COLUMN tasks.current_milestone IS '0-based index of current milestone being worked on';
COMMENT ON COLUMN tasks.completed_milestones IS 'Array of completed milestone info with txId, releasedAmount, completedAt';

-- Update existing tasks to have explicit escrow_type
UPDATE tasks SET escrow_type = 'simple' WHERE escrow_type IS NULL;
