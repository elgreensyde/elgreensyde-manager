-- =============================================
-- ELGREENSYDE FARM MANAGEMENT SYSTEM v3.0
-- Phase 3 Refinements — Advanced Scheduling & Operational Separation
-- =============================================

-- 1. Extend Tasks Table with Categories
-- Harvest (Green), Transplant/Sow (Blue), Fertilize (Yellow), Pest/Disease (Orange), Maintenance (Gray)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Harvest', 'Transplant', 'Sow', 'Fertilize', 'Pest/Disease', 'Maintenance'));

-- 2. Update existing tasks to a default category based on title (heuristics)
UPDATE tasks SET category = 'Harvest' WHERE title ILIKE '%harvest%' AND category IS NULL;
UPDATE tasks SET category = 'Transplant' WHERE title ILIKE '%transplant%' AND category IS NULL;
UPDATE tasks SET category = 'Sow' WHERE title ILIKE '%sow%' OR title ILIKE '%seed%' AND category IS NULL;
UPDATE tasks SET category = 'Fertilize' WHERE title ILIKE '%fertilize%' OR title ILIKE '%feed%' AND category IS NULL;
UPDATE tasks SET category = 'Pest/Disease' WHERE title ILIKE '%pest%' OR title ILIKE '%disease%' OR title ILIKE '%spray%' AND category IS NULL;
UPDATE tasks SET category = 'Maintenance' WHERE category IS NULL;

-- 3. Safety Check: Enforce not null for future tasks
ALTER TABLE tasks ALTER COLUMN category SET DEFAULT 'Maintenance';
