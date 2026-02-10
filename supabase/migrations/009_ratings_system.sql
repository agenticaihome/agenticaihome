-- Mutual Rating System for AgenticAiHome
-- Both parties (creator and agent) rate each other after task completion
-- Ratings are immutable, bilateral, criteria-based, and feed into EGO scores

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL,
  rater_address TEXT NOT NULL,
  ratee_address TEXT NOT NULL,
  rater_role TEXT NOT NULL CHECK (rater_role IN ('creator', 'agent')),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  criteria JSONB DEFAULT '{}',
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone can read ratings (public transparency)
CREATE POLICY "ratings_read" ON ratings 
  FOR SELECT 
  USING (true);

-- Insert policy: Anyone can insert ratings (wallet verification handled by app logic)
CREATE POLICY "ratings_insert" ON ratings 
  FOR INSERT 
  WITH CHECK (true);

-- No UPDATE or DELETE policies - ratings are immutable once submitted

-- Prevent duplicate ratings for same task + rater
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_unique_task_rater 
  ON ratings(task_id, rater_address);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ratings_task 
  ON ratings(task_id);
  
CREATE INDEX IF NOT EXISTS idx_ratings_ratee 
  ON ratings(ratee_address);
  
CREATE INDEX IF NOT EXISTS idx_ratings_rater 
  ON ratings(rater_address);

CREATE INDEX IF NOT EXISTS idx_ratings_role 
  ON ratings(rater_role);

CREATE INDEX IF NOT EXISTS idx_ratings_score 
  ON ratings(score);

CREATE INDEX IF NOT EXISTS idx_ratings_created 
  ON ratings(created_at DESC);

-- Add foreign key constraints for data integrity
-- Note: These reference existing tables
ALTER TABLE ratings 
  ADD CONSTRAINT fk_ratings_task 
  FOREIGN KEY (task_id) REFERENCES tasks(id) 
  ON DELETE CASCADE;

-- Add function to get average rating for an address
CREATE OR REPLACE FUNCTION get_average_rating(p_address TEXT, p_role TEXT DEFAULT 'all')
RETURNS TABLE(
  average_score NUMERIC,
  total_ratings INTEGER,
  score_breakdown JSONB
) AS $$
BEGIN
  IF p_role = 'all' THEN
    RETURN QUERY
    SELECT 
      COALESCE(AVG(score), 3.0) as average_score,
      COUNT(*)::INTEGER as total_ratings,
      JSON_BUILD_OBJECT(
        '5_star', COUNT(*) FILTER (WHERE score = 5),
        '4_star', COUNT(*) FILTER (WHERE score = 4),
        '3_star', COUNT(*) FILTER (WHERE score = 3),
        '2_star', COUNT(*) FILTER (WHERE score = 2),
        '1_star', COUNT(*) FILTER (WHERE score = 1)
      ) as score_breakdown
    FROM ratings 
    WHERE ratee_address = p_address;
  ELSE
    RETURN QUERY
    SELECT 
      COALESCE(AVG(score), 3.0) as average_score,
      COUNT(*)::INTEGER as total_ratings,
      JSON_BUILD_OBJECT(
        '5_star', COUNT(*) FILTER (WHERE score = 5),
        '4_star', COUNT(*) FILTER (WHERE score = 4),
        '3_star', COUNT(*) FILTER (WHERE score = 3),
        '2_star', COUNT(*) FILTER (WHERE score = 2),
        '1_star', COUNT(*) FILTER (WHERE score = 1)
      ) as score_breakdown
    FROM ratings r
    JOIN tasks t ON r.task_id = t.id
    WHERE ratee_address = p_address 
    AND (
      (p_role = 'creator' AND rater_role = 'agent') OR
      (p_role = 'agent' AND rater_role = 'creator')
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add function to get criteria averages for display
CREATE OR REPLACE FUNCTION get_criteria_averages(p_address TEXT, p_role TEXT DEFAULT 'all')
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  comm_avg NUMERIC;
  qual_avg NUMERIC; 
  time_avg NUMERIC;
  clar_avg NUMERIC;
  resp_avg NUMERIC;
  fair_avg NUMERIC;
BEGIN
  IF p_role = 'agent' OR p_role = 'all' THEN
    -- Agent criteria (rated by creators)
    SELECT 
      AVG((criteria->>'communication')::NUMERIC),
      AVG((criteria->>'quality')::NUMERIC),
      AVG((criteria->>'timeliness')::NUMERIC)
    INTO comm_avg, qual_avg, time_avg
    FROM ratings r
    JOIN tasks t ON r.task_id = t.id
    WHERE r.ratee_address = p_address 
    AND r.rater_role = 'creator'
    AND r.criteria ? 'communication';
    
    result := result || JSON_BUILD_OBJECT(
      'agent_criteria', JSON_BUILD_OBJECT(
        'communication', COALESCE(comm_avg, 3.0),
        'quality', COALESCE(qual_avg, 3.0),
        'timeliness', COALESCE(time_avg, 3.0)
      )
    );
  END IF;
  
  IF p_role = 'creator' OR p_role = 'all' THEN
    -- Creator criteria (rated by agents)  
    SELECT
      AVG((criteria->>'clarity')::NUMERIC),
      AVG((criteria->>'responsiveness')::NUMERIC),
      AVG((criteria->>'fairness')::NUMERIC)
    INTO clar_avg, resp_avg, fair_avg
    FROM ratings r
    JOIN tasks t ON r.task_id = t.id
    WHERE r.ratee_address = p_address
    AND r.rater_role = 'agent'
    AND r.criteria ? 'clarity';
    
    result := result || JSON_BUILD_OBJECT(
      'creator_criteria', JSON_BUILD_OBJECT(
        'clarity', COALESCE(clar_avg, 3.0),
        'responsiveness', COALESCE(resp_avg, 3.0),
        'fairness', COALESCE(fair_avg, 3.0)
      )
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent's average rating when new ratings are added
CREATE OR REPLACE FUNCTION update_agent_rating_on_new_rating()
RETURNS TRIGGER AS $$
DECLARE
  new_avg NUMERIC;
BEGIN
  -- Only update if rating an agent (not a creator)
  IF EXISTS (SELECT 1 FROM agents WHERE ergo_address = NEW.ratee_address OR owner_address = NEW.ratee_address) THEN
    -- Calculate new average rating for the agent
    SELECT AVG(score) INTO new_avg
    FROM ratings r
    JOIN tasks t ON r.task_id = t.id
    WHERE r.ratee_address = NEW.ratee_address;
    
    -- Update agent's rating field  
    UPDATE agents 
    SET rating = COALESCE(new_avg, 3.0)
    WHERE ergo_address = NEW.ratee_address OR owner_address = NEW.ratee_address;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_rating_on_new_rating();