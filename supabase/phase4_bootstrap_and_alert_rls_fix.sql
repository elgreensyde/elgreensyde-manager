-- Production hardening for client bootstrap compatibility and alert regeneration

-- 1. recommendation_records: explicit public policies for solo-operator app compatibility
ALTER TABLE public.recommendation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.recommendation_records;
DROP POLICY IF EXISTS "Public Read recommendation_records" ON public.recommendation_records;
DROP POLICY IF EXISTS "Public Insert recommendation_records" ON public.recommendation_records;
DROP POLICY IF EXISTS "Public Update recommendation_records" ON public.recommendation_records;
DROP POLICY IF EXISTS "Public Delete recommendation_records" ON public.recommendation_records;

CREATE POLICY "Public Read recommendation_records"
ON public.recommendation_records
FOR SELECT
USING (true);

CREATE POLICY "Public Insert recommendation_records"
ON public.recommendation_records
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public Update recommendation_records"
ON public.recommendation_records
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public Delete recommendation_records"
ON public.recommendation_records
FOR DELETE
USING (true);

-- 2. zones: explicit full lifecycle policies
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.zones;
DROP POLICY IF EXISTS "Allow public read access to zones" ON public.zones;
DROP POLICY IF EXISTS "Allow public insert to zones" ON public.zones;
DROP POLICY IF EXISTS "Public Update zones" ON public.zones;
DROP POLICY IF EXISTS "Public Delete zones" ON public.zones;

CREATE POLICY "Allow public read access to zones"
ON public.zones
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to zones"
ON public.zones
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public Update zones"
ON public.zones
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public Delete zones"
ON public.zones
FOR DELETE
USING (true);

INSERT INTO public.zones (name, type)
SELECT zone_seed.name, zone_seed.type
FROM (
  VALUES
    ('Raised Bed 1', 'Plot'),
    ('Raised Bed 2', 'Plot'),
    ('Raised Bed 3', 'Plot'),
    ('Pot Bench 1', 'Potted'),
    ('Pot Bench 2', 'Potted'),
    ('Greenhouse', 'Plot'),
    ('Outdoor', 'Plot')
) AS zone_seed(name, type)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.zones existing
  WHERE existing.name = zone_seed.name
);

-- 3. preventive_alerts: add explicit delete policy so auto-refresh can replace old alerts safely
ALTER TABLE public.preventive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.preventive_alerts;
DROP POLICY IF EXISTS "Public Read Alerts" ON public.preventive_alerts;
DROP POLICY IF EXISTS "Public Insert Alerts" ON public.preventive_alerts;
DROP POLICY IF EXISTS "Public Update Alerts" ON public.preventive_alerts;
DROP POLICY IF EXISTS "Public Delete Alerts" ON public.preventive_alerts;

CREATE POLICY "Public Read Alerts"
ON public.preventive_alerts
FOR SELECT
USING (true);

CREATE POLICY "Public Insert Alerts"
ON public.preventive_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public Update Alerts"
ON public.preventive_alerts
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public Delete Alerts"
ON public.preventive_alerts
FOR DELETE
USING (true);
