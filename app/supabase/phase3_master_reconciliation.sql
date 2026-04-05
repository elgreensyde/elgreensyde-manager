-- =============================================
-- ELGREENSYDE MASTER SCHEMA RECONCILIATION (Phase 3)
-- This script fixes the 'zones' crash and cleans up task data.
-- Run this in your Supabase SQL Editor.
-- =============================================

-- 1. Create 'zones' table (Fixes 404 zones crash)
CREATE TABLE IF NOT EXISTS public.zones (
    zone_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to zones" ON public.zones;
CREATE POLICY "Allow public read access to zones" ON public.zones FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert to zones" ON public.zones;
CREATE POLICY "Allow public insert to zones" ON public.zones FOR INSERT WITH CHECK (true);

-- 2. Extend Tasks with Categories (Fixes Color-Coding)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.tasks ALTER COLUMN category SET DEFAULT 'Maintenance';

-- 3. Data Integrity Cleanup (Fixes Missing Titles & Colors)
-- Backfill empty titles
UPDATE public.tasks SET title = 'Automated Field Check' WHERE title IS NULL OR title = '';

-- Apply categorization heuristics to existing data
UPDATE public.tasks SET category = 'Harvest' WHERE (title ILIKE '%harvest%' OR title ILIKE '%pick%') AND (category IS NULL OR category = 'Maintenance');
UPDATE public.tasks SET category = 'Transplant' WHERE (title ILIKE '%transplant%' OR title ILIKE '%sow%' OR title ILIKE '%plant%') AND (category IS NULL OR category = 'Maintenance');
UPDATE public.tasks SET category = 'Fertilize' WHERE (title ILIKE '%fertilize%' OR title ILIKE '%nutrient%' OR title ILIKE '%apply%') AND (category IS NULL OR category = 'Maintenance');
UPDATE public.tasks SET category = 'Pest/Disease' WHERE (title ILIKE '%pest%' OR title ILIKE '%disease%' OR title ILIKE '%spray%') AND (category IS NULL OR category = 'Maintenance');

-- Ensure all tasks have a non-null category
UPDATE public.tasks SET category = 'Maintenance' WHERE category IS NULL;

-- 4. Clean up the 5-task limit (Optional: remove legacy duplicates if any)
-- No destructive actions here, just schema sync.
