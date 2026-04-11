-- =============================================
-- ELGREENSYDE v3.3 — Alert System Overhaul
-- Fix: 345-alert duplication + escalation states
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add escalation state columns to preventive_alerts
ALTER TABLE preventive_alerts ADD COLUMN IF NOT EXISTS alert_status TEXT 
  DEFAULT 'New' CHECK (alert_status IN ('New', 'Acknowledged', 'Escalated', 'Resolved'));

ALTER TABLE preventive_alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE preventive_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE preventive_alerts ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- 2. PURGE DUPLICATES FIRST
-- Keep only the single newest row per (alert_type, target_type, target_id) group.
-- All older duplicates are soft-deleted as 'Resolved' so history is preserved.
WITH ranked AS (
  SELECT
    alert_id,
    alert_type,
    COALESCE(target_type, 'general') AS eff_target_type,
    COALESCE(target_id::TEXT, 'none')  AS eff_target_id,
    ROW_NUMBER() OVER (
      PARTITION BY alert_type,
                   COALESCE(target_type, 'general'),
                   COALESCE(target_id::TEXT, 'none')
      ORDER BY created_at DESC          -- keep the newest
    ) AS rn
  FROM preventive_alerts
  WHERE resolved_at IS NULL
)
UPDATE preventive_alerts
SET
  alert_status    = 'Resolved',
  resolved_at     = NOW(),
  resolution_note = 'Duplicate purged by v3.3 migration'
WHERE alert_id IN (
  SELECT alert_id FROM ranked WHERE rn > 1
);

-- 3. Also resolve all legacy dismissed rows
UPDATE preventive_alerts
SET alert_status    = 'Resolved',
    resolved_at     = NOW(),
    resolution_note = 'Migrated from legacy dismissed flag'
WHERE dismissed = TRUE
  AND (resolved_at IS NULL);

-- 4. NOW it is safe to create the unique partial index
DROP INDEX IF EXISTS idx_preventive_alerts_dedup;
CREATE UNIQUE INDEX idx_preventive_alerts_dedup
  ON preventive_alerts (
    alert_type,
    COALESCE(target_type, 'general'),
    COALESCE(target_id::TEXT, 'none')
  )
  WHERE resolved_at IS NULL;

-- 5. Update RLS to allow the new columns to be written
DROP POLICY IF EXISTS "Public Update Alerts" ON preventive_alerts;
CREATE POLICY "Public Update Alerts" ON preventive_alerts FOR UPDATE USING (true);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
