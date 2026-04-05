-- =============================================
-- ELGREENSYDE FARM MANAGEMENT SYSTEM - VERSION 2.0
-- Supabase PostgreSQL Migration
-- Run this in the Supabase SQL Editor
-- =============================================

-- WARNING: This completely wipes the old V1 schema and data
DROP TABLE IF EXISTS financial_ledger CASCADE;
DROP TABLE IF EXISTS planting_targets CASCADE;
DROP TABLE IF EXISTS order_line_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS trays CASCADE;
DROP TABLE IF EXISTS harvest_logs CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS pricing CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS feeding_log CASCADE;
DROP TABLE IF EXISTS ipm_treatments CASCADE;
DROP TABLE IF EXISTS ipm_scouting CASCADE;
DROP TABLE IF EXISTS nutrient_mixes CASCADE;
DROP TABLE IF EXISTS inventory_log CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

-- =============================================
-- MODULE 1: CUSTOMERS & PRICING
-- =============================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_number TEXT,
  address TEXT,
  type TEXT DEFAULT 'Walk-in' CHECK (type IN ('Wholesale', 'Walk-in', 'Online')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 2: LIVE INVENTORY & PRICING
-- =============================================

CREATE TABLE IF NOT EXISTS inventory (
  sku_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  sales_format TEXT DEFAULT 'Units' CHECK (sales_format IN ('Units', 'Grams')),
  current_stock DECIMAL NOT NULL DEFAULT 0,
  restock_alert_level DECIMAL NOT NULL DEFAULT 10,
  retail_price DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If migrating an existing DB, run this to add the column without dropping:
-- ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retail_price DECIMAL DEFAULT 0;

CREATE TABLE IF NOT EXISTS pricing (
  pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES inventory(sku_id) ON DELETE CASCADE,
  retail_price DECIMAL NOT NULL,
  wholesale_price DECIMAL NOT NULL,
  min_order DECIMAL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 3: CULTIVATION PIPELINES (Plots, Batches, Trays)
-- =============================================

-- The master crops library (from v1)
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT CHECK (category IN ('Microgreen', 'Herb', 'Edible Flower', 'Vegetable')),
  family TEXT,
  default_prop_method TEXT CHECK (default_prop_method IN ('Seed', 'Cutting', 'Division')),
  
  -- Lifecycle (Doc1/Doc2)
  days_to_maturity INTEGER NOT NULL,
  rooting_or_germ_days INTEGER NOT NULL,
  harvest_window_days INTEGER NOT NULL,
  nursery_days_req INTEGER DEFAULT 0,
  
  -- JSONB Fields for Scalability
  stages JSONB DEFAULT '[]', -- [{name: 'Nursery', days: 14, task: 'Thinning'}]
  varieties JSONB DEFAULT '[]', 
  soil_mix JSONB DEFAULT '{}', -- {type: 'Mix A', components: ['Coco', 'Perlite']}
  fertilizer_schedule JSONB DEFAULT '[]', -- [{week: 1, product: 'Urea', dosage: '1g/L'}]
  weather_thresholds JSONB DEFAULT '{}', -- {temp_max: 32, rain_trigger: 5, spray_interval: 7}
  pest_atlas JSONB DEFAULT '[]', -- [{name: 'Aphids', remedy: 'Neem Oil'}]
  disease_atlas JSONB DEFAULT '[]', -- [{name: 'Downy Mildew', remedy: 'K-Bicarb'}]
  checklist_questions JSONB DEFAULT '[]',
  
  yield_estimate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline A: Plot-to-Gram
CREATE TABLE IF NOT EXISTS plots (
  plot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_code TEXT UNIQUE NOT NULL, -- e.g., PLT-BSL-01
  crop_id UUID REFERENCES crops(id),
  sowing_date DATE NOT NULL,
  status TEXT DEFAULT 'Cleared' CHECK (status IN ('Active', 'Ready to Clear', 'Cleared', 'Resting')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS harvest_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(plot_id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  yield_weight_g DECIMAL NOT NULL,
  cull_weight_g DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline B: Batch-to-Pot
CREATE TABLE IF NOT EXISTS batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  crop_id UUID REFERENCES crops(id),
  propagation_method TEXT CHECK (propagation_method IN ('Seed', 'Kratky', 'Soil Cuttings')),
  start_date DATE NOT NULL,
  initial_quantity INTEGER NOT NULL,
  mortality INTEGER DEFAULT 0,
  market_ready_quantity INTEGER DEFAULT 0,
  input_cost DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'Nursery' CHECK (status IN ('Nursery', 'Completed', 'Discarded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Propagation Trays
CREATE TABLE IF NOT EXISTS trays (
  tray_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tray_code TEXT UNIQUE NOT NULL,
  crop_id UUID REFERENCES crops(id),
  sowing_date DATE NOT NULL,
  growing_medium TEXT,
  target_transplant_date DATE NOT NULL,
  status TEXT DEFAULT 'Sown' CHECK (status IN ('Sown', 'Germinated', 'Ready', 'Transplanted', 'Completed')),
  assigned_plot_id UUID REFERENCES plots(plot_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 4: MAINTENANCE LOG & TASKS
-- =============================================

-- Unified Maintenance Log (Pest & Fertilizer)
CREATE TABLE IF NOT EXISTS maintenance_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(plot_id), -- Can be NULL if applied to batch
  batch_id UUID REFERENCES batches(batch_id), -- Can be NULL if applied to plot
  event_date DATE NOT NULL,
  action_category TEXT CHECK (action_category IN ('Fertilize', 'Pest Treatment', 'Scouting')),
  target_ids JSONB DEFAULT '[]', -- NEW: Array of plot_ids or batch_ids
  method_product TEXT NOT NULL,
  dosage_rate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Queue
CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES plots(plot_id),
  batch_id UUID REFERENCES batches(batch_id),
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Overdue')),
  is_auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 5: ORDERS & POS
-- =============================================

CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(customer_id),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Packed', 'Fulfilled')),
  delivery_status TEXT CHECK (delivery_status IN ('Packed', 'Out for Delivery', 'Delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_line_items (
  line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
  sku_id UUID REFERENCES inventory(sku_id),
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 6: FINANCE (Cash P&L)
-- =============================================

CREATE TABLE IF NOT EXISTS financial_ledger (
  ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(order_id),
  entry_type TEXT CHECK (entry_type IN ('Revenue', 'Direct Expense')),
  amount DECIMAL NOT NULL,
  description TEXT NOT NULL,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MODULE 7: PLANTING TARGETS
-- =============================================

CREATE TABLE IF NOT EXISTS planting_targets (
  target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES inventory(sku_id),
  weekly_target_qty DECIMAL NOT NULL,
  avg_nursery_days INTEGER NOT NULL,
  next_target_date DATE NOT NULL,
  required_sow_date DATE NOT NULL,
  alert_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) FOR SOLO OPERATOR
-- =============================================

-- Enable RLS for all new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trays ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE planting_targets ENABLE ROW LEVEL SECURITY;

-- Allow full access for solo operator
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON pricing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON plots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON harvest_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON trays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON order_line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON financial_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON planting_targets FOR ALL USING (true) WITH CHECK (true);
