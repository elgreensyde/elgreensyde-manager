-- =============================================
-- ELGREENSYDE FARM MANAGEMENT SYSTEM v3.0
-- Phase 3 Migration — Weather Cache & Scheduling Support
-- =============================================

-- 1. Weather Cache Table
-- Valencia City, Bukidnon (7.9059, 125.0936)
CREATE TABLE IF NOT EXISTS weather_cache (
    id SERIAL PRIMARY KEY,
    lat DECIMAL NOT NULL,
    lon DECIMAL NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Ensure only one record per location (or just one total for this single farm app)
CREATE UNIQUE INDEX IF NOT EXISTS weather_cache_location_idx ON weather_cache (lat, lon);

-- 2. Task Extensions (Metadata for smarter scheduling)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(batch_id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plot_id UUID REFERENCES plots(plot_id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS weather_sensitive BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS conflict_details JSONB DEFAULT '{}'::jsonb;

-- 3. Example Seed for Weather (Testing)
-- Empty initially, first fetch will populate
