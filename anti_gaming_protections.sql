-- Anti-Gaming Protections for Rating System
-- Applied: 2026-02-10
-- Purpose: Harden the rating system against bad actors and gaming attempts

-- 1. Add task_value_erg column to ratings table for value weighting
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS task_value_erg NUMERIC DEFAULT 0;

-- 2. Create value-weighted average rating function
CREATE OR REPLACE FUNCTION get_weighted_average_rating(p_address TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    SUM(score * LN(1 + GREATEST(task_value_erg, 0.1))) / NULLIF(SUM(LN(1 + GREATEST(task_value_erg, 0.1))), 0),
    3.0
  )
  FROM ratings WHERE ratee_address = p_address;
$$ LANGUAGE sql;

-- 3. Create outlier dampening function with minimum task value threshold
CREATE OR REPLACE FUNCTION get_dampened_weighted_rating(p_address TEXT)
RETURNS NUMERIC AS $$
DECLARE
    rating_record RECORD;
    consensus_avg NUMERIC;
    dampened_weight NUMERIC;
    total_weighted_score NUMERIC := 0;
    total_weight NUMERIC := 0;
BEGIN
    -- Get consensus rating for this address
    SELECT COALESCE(AVG(score), 3.0) INTO consensus_avg
    FROM ratings
    WHERE ratee_address = p_address;
    
    -- Loop through each rating and apply dampening to outliers
    FOR rating_record IN 
        SELECT score, task_value_erg, rater_address
        FROM ratings 
        WHERE ratee_address = p_address
        AND task_value_erg >= 0.5  -- Minimum value threshold (0.5 ERG)
    LOOP
        -- Calculate base weight from task value (logarithmic scaling)
        dampened_weight := LN(1 + GREATEST(rating_record.task_value_erg, 0.1));
        
        -- Apply outlier dampening: if rating deviates 2+ stars from consensus, reduce weight by 50%
        IF ABS(rating_record.score - consensus_avg) >= 2.0 THEN
            dampened_weight := dampened_weight * 0.5;
        END IF;
        
        -- Accumulate weighted scores
        total_weighted_score := total_weighted_score + (rating_record.score * dampened_weight);
        total_weight := total_weight + dampened_weight;
    END LOOP;
    
    -- Return weighted average or default neutral rating
    IF total_weight > 0 THEN
        RETURN total_weighted_score / total_weight;
    ELSE
        RETURN 3.0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Backfill task_value_erg for existing ratings
UPDATE ratings 
SET task_value_erg = (
  SELECT COALESCE(tasks.budget_erg, 0)
  FROM tasks 
  WHERE tasks.id = ratings.task_id
)
WHERE task_value_erg = 0 OR task_value_erg IS NULL;

-- 5. Create index for performance on new column
CREATE INDEX IF NOT EXISTS idx_ratings_task_value ON ratings(task_value_erg);

-- 6. Add comment explaining the anti-gaming protections
COMMENT ON COLUMN ratings.task_value_erg IS 'Task value in ERG used for weighted ratings. Higher value tasks have more impact on reputation scores. Minimum 0.5 ERG threshold for EGO score calculation.';

-- 7. Create a view for high-value ratings only (used in EGO score calculations)
CREATE OR REPLACE VIEW high_value_ratings AS
SELECT *
FROM ratings
WHERE task_value_erg >= 0.5;

COMMENT ON VIEW high_value_ratings IS 'Ratings from tasks worth >= 0.5 ERG. Used for EGO score calculations to prevent micro-task spam gaming.';