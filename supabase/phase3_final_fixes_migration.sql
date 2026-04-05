-- Final Fixes for Phase 3 Verification
-- 1. Create 'zones' table
CREATE TABLE IF NOT EXISTS public.zones (
    zone_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for zones
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Allow public insert to zones" ON public.zones FOR INSERT WITH CHECK (true);

-- 2. Fix Task Titles & Categorization
-- Ensure 'title' is not null and has a default for any future mishaps
ALTER TABLE public.tasks ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN title SET DEFAULT 'Unnamed Task';

-- Backfill missing titles for existing tasks (if any)
UPDATE public.tasks SET title = 'Automated Field Check' WHERE title IS NULL OR title = '';

-- 3. Ensure 'category' column exists before categorization
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.tasks ALTER COLUMN category SET DEFAULT 'Maintenance';

-- Categorization Cleanup (Based on title keywords)
UPDATE public.tasks 
SET category = 'Harvest' 
WHERE (category IS NULL OR category = 'Maintenance') AND (title ILIKE '%harvest%' OR title ILIKE '%pick%');

UPDATE public.tasks 
SET category = 'Transplant' 
WHERE (category IS NULL OR category = 'Maintenance') AND (title ILIKE '%transplant%' OR title ILIKE '%sow%' OR title ILIKE '%plant%');

UPDATE public.tasks 
SET category = 'Fertilize' 
WHERE (category IS NULL OR category = 'Maintenance') AND (title ILIKE '%fertilize%' OR title ILIKE '%nutrient%' OR title ILIKE '%apply%');

UPDATE public.tasks 
SET category = 'Pest/Disease' 
WHERE (category IS NULL OR category = 'Maintenance') AND (title ILIKE '%pest%' OR title ILIKE '%disease%' OR title ILIKE '%spray%' OR title ILIKE '%neem%');

-- Verify seeding triggers (handled in frontend initializeSeedData)
