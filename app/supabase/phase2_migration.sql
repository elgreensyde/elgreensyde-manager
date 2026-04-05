-- =============================================
-- ELGREENSYDE v3.0 — Phase 2 Migration
-- Monitoring & Recommendation Engine
-- Run in Supabase SQL Editor after Phase 1
-- =============================================

-- 1. Monitoring Sessions
CREATE TABLE IF NOT EXISTS monitoring_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL CHECK (session_type IN ('Daily Scan', 'Weekly Full Check', 'Triggered Check')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  nursery_humidity TEXT,
  nursery_temp TEXT,
  nursery_airflow TEXT,
  nursery_rain TEXT,
  nursery_light TEXT,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Checklist Responses (per plot/tray per session)
CREATE TABLE IF NOT EXISTS checklist_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES monitoring_sessions(session_id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('plot', 'tray', 'batch')),
  target_id UUID,
  crop_id UUID REFERENCES crops(id),
  section TEXT,
  question TEXT NOT NULL,
  answer TEXT CHECK (answer IN ('Yes', 'No', 'N/A', 'Mild', 'Moderate', 'Severe')),
  notes TEXT,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recommendation Records (intelligence database)
CREATE TABLE IF NOT EXISTS recommendation_records (
  record_id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Pest', 'Disease', 'Nutrient', 'Environmental', 'Post-Transplant')),
  crop_id UUID REFERENCES crops(id),
  crop_name TEXT,
  variety TEXT,
  growth_stage TEXT,
  trigger_conditions JSONB DEFAULT '[]'::jsonb,
  severity_level TEXT CHECK (severity_level IN ('Critical', 'High', 'Medium', 'Low')),
  recommendation_title TEXT NOT NULL,
  recommendation_body TEXT NOT NULL,
  product_id UUID REFERENCES inputs_inventory(input_id),
  product_name TEXT,
  application_rate TEXT,
  application_method TEXT,
  withholding_override_days INTEGER,
  follow_up_days INTEGER,
  follow_up_action TEXT,
  notes TEXT,
  is_placeholder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Flagged Issues (active issues from monitoring)
CREATE TABLE IF NOT EXISTS flagged_issues (
  flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES monitoring_sessions(session_id),
  target_type TEXT CHECK (target_type IN ('plot', 'tray', 'batch', 'nursery')),
  target_id UUID,
  record_id TEXT REFERENCES recommendation_records(record_id),
  issue_type TEXT CHECK (issue_type IN ('Pest', 'Disease', 'Nutrient', 'Environmental', 'Post-Transplant')),
  severity TEXT CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Treating', 'Monitoring', 'Resolved')),
  resolved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Preventive Alert Log (auto-generated alerts)
CREATE TABLE IF NOT EXISTS preventive_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('plot', 'tray', 'batch', 'sku', 'general')),
  target_id UUID,
  message TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  dismissed BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON monitoring_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON checklist_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON recommendation_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON flagged_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON preventive_alerts FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- MIGRATION COMPLETE
-- Next: Run app and let seedRecommendations.js populate records
-- =============================================
