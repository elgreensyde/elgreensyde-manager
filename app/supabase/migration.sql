-- =============================================
-- ELGREENSYDE FARM MANAGEMENT SYSTEM
-- Supabase PostgreSQL Migration
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. CROP LIBRARY
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Microgreen', 'Herb', 'Edible Flower', 'Vegetable')),
  default_prop_method TEXT CHECK (default_prop_method IN ('Seed', 'Cutting', 'Division')),
  days_to_maturity INTEGER NOT NULL,
  rooting_or_germ_days INTEGER NOT NULL,
  harvest_window_days INTEGER NOT NULL,
  ec_min DECIMAL, ec_max DECIMAL,
  ph_min DECIMAL, ph_max DECIMAL,
  yield_estimate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BATCHES
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  crop_id UUID REFERENCES crops(id),
  propagation_method TEXT CHECK (propagation_method IN ('Seed', 'Cutting', 'Division')),
  planting_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'pots',
  growing_zone TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Ready', 'Harvested', 'Sold', 'Discarded')),
  ipm_locked BOOLEAN DEFAULT FALSE,
  ipm_unlock_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Overdue')),
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Normal', 'High', 'Critical')),
  is_auto_generated BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  current_qty DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_threshold DECIMAL NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTORY LOG
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id),
  change_qty DECIMAL NOT NULL,
  reason TEXT,
  batch_id UUID REFERENCES batches(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SALES
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  batch_id UUID REFERENCES batches(id),
  sell_type TEXT CHECK (sell_type IN ('Per Gram', 'Potted Plant', 'Seedling', 'Runner')),
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL,
  total_amount DECIMAL NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  batch_id UUID REFERENCES batches(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NUTRIENT MIXES
CREATE TABLE IF NOT EXISTS nutrient_mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_date DATE NOT NULL,
  recipe_name TEXT,
  volume_liters DECIMAL,
  components JSONB,
  target_ec DECIMAL,
  target_ph DECIMAL,
  actual_ec DECIMAL,
  actual_ph DECIMAL,
  applied_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FEEDING LOG
CREATE TABLE IF NOT EXISTS feeding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_date DATE NOT NULL,
  batch_id UUID REFERENCES batches(id),
  zone TEXT,
  product_applied TEXT,
  dosage TEXT,
  ec_after DECIMAL,
  ph_after DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. IPM SCOUTING
CREATE TABLE IF NOT EXISTS ipm_scouting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_date DATE NOT NULL,
  batch_id UUID REFERENCES batches(id),
  zone TEXT,
  pest_disease TEXT,
  severity TEXT CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  action_taken TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. IPM TREATMENTS
CREATE TABLE IF NOT EXISTS ipm_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_date DATE NOT NULL,
  batch_id UUID REFERENCES batches(id),
  zone TEXT,
  treatment_used TEXT NOT NULL,
  volume_applied TEXT,
  method TEXT,
  withholding_days INTEGER NOT NULL,
  safe_harvest_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DISABLE RLS FOR SOLO OPERATOR (simplicity)
-- =============================================
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrient_mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipm_scouting ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipm_treatments ENABLE ROW LEVEL SECURITY;

-- Allow full access with anon key (solo operator)
CREATE POLICY "Allow all access" ON crops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON inventory_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON nutrient_mixes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON feeding_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON ipm_scouting FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON ipm_treatments FOR ALL USING (true) WITH CHECK (true);

-- 12. ZONES
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'Plot',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON zones FOR ALL USING (true) WITH CHECK (true);
