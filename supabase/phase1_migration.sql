-- =============================================
-- ELGREENSYDE FARM MANAGEMENT SYSTEM v3.0
-- Phase 1 Migration — Crop Library Expansion + Inputs Inventory
-- Run this in the Supabase SQL Editor AFTER the v2.0 migration
-- =============================================

-- =============================================
-- 1. EXPAND CROPS TABLE → FULL CROP LIBRARY
-- Adding ~35 agronomic columns per Doc1 Section 9
-- =============================================

-- Identification & Classification
ALTER TABLE crops ADD COLUMN IF NOT EXISTS scientific_name TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS family TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS varieties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS growth_type TEXT CHECK (growth_type IN ('Cut and come again', 'Single harvest', 'Perennial', 'Annual'));
ALTER TABLE crops ADD COLUMN IF NOT EXISTS format TEXT CHECK (format IN ('Bulk grams', 'Units', 'Both'));

-- Lifecycle Timing
ALTER TABLE crops ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS avg_nursery_days INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS days_to_first_harvest INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS harvest_interval_days INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS plot_lifespan_days INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS resting_days INTEGER;

-- Bed / Plot Requirements
ALTER TABLE crops ADD COLUMN IF NOT EXISTS spacing_cm TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS plants_per_sqm DECIMAL;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS min_bed_depth_cm INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS mound_height_cm INTEGER;

-- Pot Requirements
ALTER TABLE crops ADD COLUMN IF NOT EXISTS pot_diameter_cm INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS pot_depth_cm INTEGER;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS pot_material TEXT;

-- Soil & Nutrition
ALTER TABLE crops ADD COLUMN IF NOT EXISTS soil_mix JSONB DEFAULT '{}'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS cow_manure_excluded BOOLEAN DEFAULT FALSE;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS fertilizer_schedule JSONB DEFAULT '[]'::jsonb;

-- Weather & Scheduling
ALTER TABLE crops ADD COLUMN IF NOT EXISTS weather_thresholds JSONB DEFAULT '{}'::jsonb;

-- Crop Rotation
ALTER TABLE crops ADD COLUMN IF NOT EXISTS rotation_family TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS avoid_after JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS recommended_after JSONB DEFAULT '[]'::jsonb;

-- Pest, Disease & Nutrient Intelligence
ALTER TABLE crops ADD COLUMN IF NOT EXISTS pest_records JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS disease_records JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS nutrient_records JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS checklist_questions JSONB DEFAULT '{}'::jsonb;

-- Harvest Information
ALTER TABLE crops ADD COLUMN IF NOT EXISTS harvest_indicators TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS harvest_method TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS yield_per_sqm TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS yield_per_pot TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS postharvest_notes TEXT;

-- Edible Flower Specifics
ALTER TABLE crops ADD COLUMN IF NOT EXISTS edible_parts TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS pesticide_free_required BOOLEAN DEFAULT FALSE;

-- Risk Flags
ALTER TABLE crops ADD COLUMN IF NOT EXISTS high_risk_flag TEXT;

-- Draft status for CSV imports
ALTER TABLE crops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =============================================
-- 2. EXPAND PLOTS TABLE — Full Status Lifecycle
-- =============================================

-- Drop old check constraint and add expanded one
ALTER TABLE plots DROP CONSTRAINT IF EXISTS plots_status_check;
ALTER TABLE plots ADD CONSTRAINT plots_status_check 
  CHECK (status IN ('Under Construction', 'Ready to Plant', 'Active', 'Ready to Clear', 'Cleared', 'Resting', 'Blocked'));

-- Update any existing 'Cleared' records to the new default
-- (no data loss — Cleared is still valid)

ALTER TABLE plots ADD COLUMN IF NOT EXISTS variety TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS width_m DECIMAL;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS length_m DECIMAL;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS area_sqm DECIMAL;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS mound_height_cm INTEGER;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS establishment_method TEXT CHECK (establishment_method IN ('Seeds', 'Cuttings'));
ALTER TABLE plots ADD COLUMN IF NOT EXISTS transplant_date DATE;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS previous_crop_id UUID REFERENCES crops(id);
ALTER TABLE plots ADD COLUMN IF NOT EXISTS resting_since DATE;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS amendments_applied JSONB DEFAULT '[]'::jsonb;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS location_description TEXT;

-- =============================================
-- 3. EXPAND BATCHES TABLE — Mortality + Watch List
-- =============================================

ALTER TABLE batches ADD COLUMN IF NOT EXISTS variety TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS days_to_maturity INTEGER;

-- Expand batch status options
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_status_check;
ALTER TABLE batches ADD CONSTRAINT batches_status_check 
  CHECK (status IN ('Nursery', 'Market Ready', 'Sold Out', 'Completed', 'Discarded', 'Archived'));

-- =============================================
-- 4. EXPAND TRAYS TABLE
-- =============================================

ALTER TABLE trays ADD COLUMN IF NOT EXISTS variety TEXT;
ALTER TABLE trays ADD COLUMN IF NOT EXISTS establishment_method TEXT CHECK (establishment_method IN ('Seeds', 'Cuttings'));
ALTER TABLE trays ADD COLUMN IF NOT EXISTS initial_quantity INTEGER;
ALTER TABLE trays ADD COLUMN IF NOT EXISTS germination_rate DECIMAL;
ALTER TABLE trays ADD COLUMN IF NOT EXISTS actual_transplant_date DATE;
ALTER TABLE trays ADD COLUMN IF NOT EXISTS destination_type TEXT CHECK (destination_type IN ('plot', 'batch'));
ALTER TABLE trays ADD COLUMN IF NOT EXISTS assigned_batch_id UUID REFERENCES batches(batch_id);
ALTER TABLE trays ADD COLUMN IF NOT EXISTS notes TEXT;

-- Expand tray status
ALTER TABLE trays DROP CONSTRAINT IF EXISTS trays_status_check;
ALTER TABLE trays ADD CONSTRAINT trays_status_check 
  CHECK (status IN ('Sown', 'Germinated', 'Ready', 'Transplanted', 'Completed', 'Archived'));

-- =============================================
-- 5. CREATE INPUTS INVENTORY TABLE
-- Farm supply tracker for fertilizers, pesticides, etc.
-- =============================================

CREATE TABLE IF NOT EXISTS inputs_inventory (
  input_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Organic Pesticide', 'Fungicide', 'Fertilizer', 'Soil Amendment')),
  active_ingredient TEXT,
  mix_rate TEXT,
  current_stock DECIMAL NOT NULL DEFAULT 0,
  stock_unit TEXT CHECK (stock_unit IN ('ml', 'grams', 'liters', 'kg')),
  low_stock_threshold DECIMAL DEFAULT 0,
  withholding_days INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inputs_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON inputs_inventory FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 6. EXPAND MAINTENANCE_LOGS
-- Add input tracking, volume, checklist_triggered
-- =============================================

ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS input_id UUID REFERENCES inputs_inventory(input_id);
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS volume_applied DECIMAL;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS checklist_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS target_ids JSONB DEFAULT '[]'::jsonb;

-- Expand action_category options
ALTER TABLE maintenance_logs DROP CONSTRAINT IF EXISTS maintenance_logs_action_category_check;
ALTER TABLE maintenance_logs ADD CONSTRAINT maintenance_logs_action_category_check 
  CHECK (action_category IN ('Fertilize', 'Pest Treatment', 'Disease Treatment', 'Scouting', 'Preventive'));

-- =============================================
-- 7. EXPAND HARVEST_LOGS
-- Add assessment link for Harvest Safety Assessment (Phase 2)
-- =============================================

ALTER TABLE harvest_logs ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE harvest_logs ADD COLUMN IF NOT EXISTS harvest_outcome TEXT CHECK (harvest_outcome IN ('Safe', 'Caution - Harvested', 'Caution - Partial', 'Blocked'));
ALTER TABLE harvest_logs ADD COLUMN IF NOT EXISTS notes TEXT;

-- =============================================
-- 8. CREATE POT WATCH LIST
-- Individual pot flagging for batch monitoring
-- =============================================

CREATE TABLE IF NOT EXISTS pot_watch_list (
  watch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(batch_id) ON DELETE CASCADE,
  pot_label TEXT NOT NULL,
  herb_type TEXT,
  issue_flagged TEXT NOT NULL,
  date_flagged DATE NOT NULL,
  daily_status TEXT DEFAULT 'Same' CHECK (daily_status IN ('Improving', 'Same', 'Worsening')),
  resolution_outcome TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pot_watch_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON pot_watch_list FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 9. SEED CUST-WALKIN FALLBACK CUSTOMER
-- All anonymous POS transactions will reference this record
-- =============================================

INSERT INTO customers (name, contact_number, type, notes)
SELECT 'Walk-in Customer', '', 'Walk-in', 'Default fallback for anonymous POS transactions'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name = 'Walk-in Customer' AND type = 'Walk-in');

-- =============================================
-- 10. EXPAND TASKS TABLE
-- Link to trays as well
-- =============================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tray_id UUID REFERENCES trays(tray_id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_entity_type TEXT CHECK (linked_entity_type IN ('plot', 'batch', 'tray', 'sku'));

-- =============================================
-- MIGRATION COMPLETE
-- Next: Run the app and let seedCropLibrary.js populate the 20 crops
-- =============================================
