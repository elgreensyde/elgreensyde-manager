-- Phase 5: Seed-to-Harvest Traceability & Filtering
-- Run this in the Supabase SQL Editor

-- 1. Add Traceability & Operational Columns
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS tray_id UUID REFERENCES trays(tray_id);
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS labor_minutes NUMERIC DEFAULT 0;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS water_volume_l NUMERIC DEFAULT 0;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS growth_stage TEXT;

-- 2. Expand action_category enum (via check constraint)
-- First drop the old one if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_logs_action_category_check') THEN
        ALTER TABLE maintenance_logs DROP CONSTRAINT maintenance_logs_action_category_check;
    END IF;
END $$;

ALTER TABLE maintenance_logs ADD CONSTRAINT maintenance_logs_action_category_check 
CHECK (action_category IN ('Fertilizer', 'Fungicide', 'Pesticide', 'Physical', 'Irrigation', 'Scouting', 'System Flag'));

-- 3. Update the RPC function to support new columns
CREATE OR REPLACE FUNCTION log_maintenance_with_deduction(
    p_action_category TEXT,
    p_target_ids UUID[],
    p_input_id UUID,
    p_dosage_rate TEXT,
    p_notes TEXT,
    p_amount_to_deduct DECIMAL,
    p_tray_id UUID DEFAULT NULL,
    p_labor_minutes NUMERIC DEFAULT 0,
    p_water_volume_l NUMERIC DEFAULT 0,
    p_growth_stage TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_product_name TEXT;
BEGIN
    -- 1. Get product name if input_id is provided
    IF p_input_id IS NOT NULL THEN
        SELECT product_name INTO v_product_name FROM inputs_inventory WHERE input_id = p_input_id;
        
        -- Deduct Stock
        UPDATE inputs_inventory 
        SET current_stock = current_stock - p_amount_to_deduct
        WHERE input_id = p_input_id;
    END IF;

    -- 2. Insert maintenance log
    INSERT INTO maintenance_logs (
        event_date,
        action_category,
        target_ids,
        method_product,
        dosage_rate,
        notes,
        input_id,
        tray_id,
        labor_minutes,
        water_volume_l,
        growth_stage
    ) VALUES (
        CURRENT_DATE,
        p_action_category,
        p_target_ids,
        v_product_name,
        p_dosage_rate,
        p_notes,
        p_input_id,
        p_tray_id,
        p_labor_minutes,
        p_water_volume_l,
        p_growth_stage
    );
END;
$$ LANGUAGE plpgsql;
