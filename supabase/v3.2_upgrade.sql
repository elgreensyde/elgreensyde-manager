-- ELGREENSYDE v3.2 UPGRADE
-- Connect Monitoring, Maintenance, and Batches

-- 1. Upgrade flagged_issues table
ALTER TABLE flagged_issues ADD COLUMN IF NOT EXISTS threat_category TEXT;
ALTER TABLE flagged_issues ADD COLUMN IF NOT EXISTS specific_symptom TEXT;
ALTER TABLE flagged_issues ADD COLUMN IF NOT EXISTS is_active_threat BOOLEAN DEFAULT TRUE;

-- 2. Upgrade maintenance_logs table
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS inventory_sku UUID REFERENCES inventory(sku_id);
-- Note: input_id already exists and refers to inputs_inventory, 
-- but inventory_sku will allow linking to the broader inventory if needed.
-- Actually, the user asked for "Consumable SKU from the inventory".
-- Looking at the schema, 'inventory' has sellable products and 'inputs_inventory' has consumables.
-- I will use input_id for consumables.

ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS withholding_period_days INTEGER;

-- 3. Create or Update decrement_inventory function (Consumables Focus)
CREATE OR REPLACE FUNCTION decrement_inventory(target_sku UUID, amount_to_deduct DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE inputs_inventory
  SET current_stock = current_stock - amount_to_deduct
  WHERE input_id = target_sku;
END;
$$ LANGUAGE plpgsql;

-- 4. RLS Bypass Policies for Public Access
ALTER TABLE flagged_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read" ON flagged_issues;
DROP POLICY IF EXISTS "Public Insert" ON flagged_issues;
DROP POLICY IF EXISTS "Public Update" ON flagged_issues;
CREATE POLICY "Public Read" ON flagged_issues FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON flagged_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON flagged_issues FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Read Alerts" ON preventive_alerts;
DROP POLICY IF EXISTS "Public Insert Alerts" ON preventive_alerts;
DROP POLICY IF EXISTS "Public Update Alerts" ON preventive_alerts;
CREATE POLICY "Public Read Alerts" ON preventive_alerts FOR SELECT USING (true);
CREATE POLICY "Public Insert Alerts" ON preventive_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Alerts" ON preventive_alerts FOR UPDATE USING (true);


