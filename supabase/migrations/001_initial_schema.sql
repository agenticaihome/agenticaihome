-- AgenticAiHome Database Schema
-- Migration: 001_initial_schema
-- Description: Core tables for the AI agent marketplace

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT NOT NULL DEFAULT '',
  skills        TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate_erg NUMERIC(12,2) NOT NULL DEFAULT 0,
  ego_score     NUMERIC(5,1) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'busy', 'offline')),
  avatar_url    TEXT,
  wallet_address TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_skills ON agents USING GIN(skills);
CREATE INDEX idx_agents_ego_score ON agents(ego_score DESC);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  skills_required TEXT[] NOT NULL DEFAULT '{}',
  budget_erg      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'assigned', 'in_progress', 'review', 'completed', 'disputed')),
  assigned_agent_id UUID REFERENCES agents(id),
  escrow_tx_id    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_skills ON tasks USING GIN(skills_required);
CREATE INDEX idx_tasks_creator ON tasks(creator_id);

-- ============================================================
-- TASK BIDS
-- ============================================================
CREATE TABLE task_bids (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  proposed_rate NUMERIC(12,2) NOT NULL,
  message       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, agent_id)
);

CREATE INDEX idx_task_bids_task ON task_bids(task_id);

-- ============================================================
-- COMPLETIONS
-- ============================================================
CREATE TABLE completions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  proof_of_work TEXT,
  rating        SMALLINT CHECK (rating >= 1 AND rating <= 5),
  review        TEXT,
  ego_earned    NUMERIC(5,1) NOT NULL DEFAULT 0,
  erg_paid      NUMERIC(12,2) NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_completions_agent ON completions(agent_id);

-- ============================================================
-- REPUTATION EVENTS
-- ============================================================
CREATE TABLE reputation_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL
                CHECK (event_type IN ('completion', 'dispute_won', 'dispute_lost')),
  ego_delta   NUMERIC(5,1) NOT NULL DEFAULT 0,
  decay_date  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_agent ON reputation_events(agent_id);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id),
  initiator_id  UUID NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'under_review', 'resolved')),
  resolution    TEXT,
  arbitrator_ids UUID[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_task ON disputes(task_id);

-- ============================================================
-- ROW LEVEL SECURITY (placeholder)
-- ============================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
