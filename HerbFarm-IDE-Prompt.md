# 🌿 HERB FARM MANAGEMENT SYSTEM — AI IDE PROMPT

---

## PROJECT BRIEF

Build a full-stack farm management web application for a solo-operated herbs and edible flowers farm in Cagayan de Oro, Philippines. The operator manages everything alone — from land preparation to sales — across three growing setups: pots/containers (soil), raised beds (in-ground), and hydroponics. Sales happen via walk-in buyers and online delivery orders.

The core problem to solve: the operator currently tracks everything in their head and has no system. Every morning is chaotic. The app must replace mental overhead with a clear, automated daily workflow.

---

## TECH STACK

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL database + Auth + REST API)
- **Hosting:** Vercel (frontend), Supabase (backend)
- **Target device:** Mobile-first (used on phone daily), also works on desktop
- **Deployment type:** PWA (installable to home screen, no app store needed)

---

## CORE CONCEPT: THE BATCH

The central unit of the entire system is a **Batch** — a group of plants of the same crop, planted on the same date, in the same zone. Every feature connects to batches:
- Inventory is deducted when a batch is created
- Tasks are auto-generated from a batch's crop rules
- Sales are linked to a batch
- IPM treatments lock a batch from being sold
- Finance tracks cost and revenue per batch

---

## DATABASE SCHEMA

Create the following tables in Supabase (PostgreSQL):

```sql
-- 1. CROP LIBRARY
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT CHECK (category IN ('Microgreen', 'Herb', 'Edible Flower', 'Vegetable')),
  days_to_maturity INTEGER NOT NULL,
  germination_days INTEGER NOT NULL,
  harvest_window_days INTEGER NOT NULL,
  ec_min DECIMAL,
  ec_max DECIMAL,
  ph_min DECIMAL,
  ph_max DECIMAL,
  sunlight TEXT,
  temp_min DECIMAL,
  temp_max DECIMAL,
  humidity_min DECIMAL,
  humidity_max DECIMAL,
  yield_estimate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BATCHES
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL, -- e.g., B-2025-047
  crop_id UUID REFERENCES crops(id),
  planting_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'pots', -- pots / trays / plants
  growing_zone TEXT, -- e.g., "Hydro Bay A", "Raised Bed 1"
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Ready', 'Harvested', 'Sold', 'Discarded')),
  ipm_locked BOOLEAN DEFAULT FALSE,
  ipm_unlock_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Overdue')),
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  is_auto_generated BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BATCH HISTORY LOG
CREATE TABLE batch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  event_type TEXT, -- e.g., 'Sown', 'Thinned', 'Harvested', 'IPM Applied', 'Sold'
  description TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTORY ITEMS
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Hard Goods', 'Consumable', 'Seeds', 'Fertilizer', 'Packaging', 'Propagation', 'Other')),
  current_qty DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL, -- pcs, g, kg, liters
  min_threshold DECIMAL NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL, -- for COGS calculations
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVENTORY LOG (audit trail of all changes)
CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id),
  change_qty DECIMAL NOT NULL, -- positive = added, negative = used
  reason TEXT, -- 'Batch Created', 'Manual Adjustment', 'Purchase'
  batch_id UUID REFERENCES batches(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUSTOMERS
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Walk-in', 'Regular', 'Wholesale', 'Online')),
  contact TEXT,
  address TEXT,
  discount_percent DECIMAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES (POS transactions)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id),
  batch_id UUID REFERENCES batches(id),
  crop_id UUID REFERENCES crops(id),
  sell_type TEXT CHECK (sell_type IN ('Per Gram', 'Potted Plant', 'Seedling', 'Runner')),
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL NOT NULL,
  discount_percent DECIMAL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'GCash', 'Bank Transfer', 'Other')),
  notes TEXT
);

-- 9. EXPENSES
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category TEXT CHECK (category IN ('Seeds', 'Fertilizers', 'Packaging', 'Equipment', 'Utilities', 'Labor', 'Transport', 'Miscellaneous')),
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  batch_id UUID REFERENCES batches(id), -- optional link to a specific batch
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NUTRIENT MIXING LOG
CREATE TABLE nutrient_mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_date DATE NOT NULL,
  recipe_name TEXT,
  volume_liters DECIMAL,
  components JSONB, -- e.g., {"masterblend_g": 12, "calcium_nitrate_g": 11, "mgso4_g": 6}
  target_ec DECIMAL,
  target_ph DECIMAL,
  actual_ec DECIMAL,
  actual_ph DECIMAL,
  applied_to TEXT, -- zone or batch description
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FEEDING LOG
CREATE TABLE feeding_log (
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

-- 12. IPM SCOUTING
CREATE TABLE ipm_scouting (
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

-- 13. IPM TREATMENTS
CREATE TABLE ipm_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_date DATE NOT NULL,
  batch_id UUID REFERENCES batches(id),
  zone TEXT,
  treatment_used TEXT NOT NULL,
  volume_applied TEXT,
  method TEXT,
  withholding_days INTEGER NOT NULL,
  safe_harvest_date DATE NOT NULL, -- treatment_date + withholding_days
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## TASK AUTO-GENERATION LOGIC

When a batch is created, auto-generate these tasks by calculating due dates from `planting_date + crop rules`:

```javascript
function generateBatchTasks(batch, crop) {
  const plant = new Date(batch.planting_date);
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

  return [
    {
      title: `Sow seeds — ${batch.batch_code}`,
      due_date: plant,
      priority: 'High'
    },
    {
      title: `Check germination — ${batch.batch_code} (${crop.common_name})`,
      due_date: addDays(plant, crop.germination_days),
      priority: 'Normal'
    },
    {
      title: `Thin seedlings if overcrowded — ${batch.batch_code}`,
      due_date: addDays(plant, Math.round(crop.days_to_maturity * 0.25)),
      priority: 'Normal'
    },
    {
      title: `Move to full sun — ${batch.batch_code} (${crop.common_name})`,
      due_date: addDays(plant, Math.round(crop.days_to_maturity * 0.40)),
      priority: 'Normal'
    },
    {
      title: `Pre-harvest check — EC/pH reading for ${batch.batch_code}`,
      due_date: addDays(plant, Math.round(crop.days_to_maturity * 0.85)),
      priority: 'High'
    },
    {
      title: `🌿 HARVEST READY — ${batch.batch_code} (${crop.common_name}) — ${crop.yield_estimate}`,
      due_date: addDays(plant, crop.days_to_maturity),
      priority: 'Critical'
    },
    {
      title: `⚠️ OVERDUE — Harvest or discard ${batch.batch_code} — past harvest window`,
      due_date: addDays(plant, crop.days_to_maturity + crop.harvest_window_days),
      priority: 'Critical'
    }
  ];
}
```

---

## BATCH STAGE CALCULATION

Calculate current stage dynamically from today's date:

```javascript
function getBatchStage(batch, crop) {
  const today = new Date();
  const planted = new Date(batch.planting_date);
  const daysElapsed = Math.floor((today - planted) / 86400000);

  if (daysElapsed < crop.germination_days) return { stage: 'Germinating', color: 'gray', percent: Math.round((daysElapsed / crop.germination_days) * 100) };
  if (daysElapsed < crop.days_to_maturity * 0.3) return { stage: 'Seedling', color: 'yellow', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100) };
  if (daysElapsed < crop.days_to_maturity * 0.8) return { stage: 'Vegetative', color: 'green', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100) };
  if (daysElapsed < crop.days_to_maturity) return { stage: 'Pre-Harvest', color: 'blue', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100) };
  if (daysElapsed <= crop.days_to_maturity + crop.harvest_window_days) return { stage: 'Ready to Harvest', color: 'emerald', percent: 100 };
  return { stage: 'OVERDUE', color: 'red', percent: 100 };
}
```

---

## IPM WITHHOLDING LOCK

When a treatment is logged:

```javascript
async function applyIPMTreatment(batchId, treatmentDate, withholdingDays) {
  const safeDate = new Date(treatmentDate);
  safeDate.setDate(safeDate.getDate() + withholdingDays);

  // Lock the batch
  await supabase.from('batches').update({
    ipm_locked: true,
    ipm_unlock_date: safeDate.toISOString().split('T')[0]
  }).eq('id', batchId);

  // Log to batch history
  await supabase.from('batch_history').insert({
    batch_id: batchId,
    event_type: 'IPM Applied',
    description: `Treatment applied. Locked until ${safeDate.toDateString()}.`
  });
}

// Run daily (cron job or on app load) to auto-unlock expired withholdings
async function checkWithholdingExpirations() {
  const today = new Date().toISOString().split('T')[0];
  await supabase.from('batches')
    .update({ ipm_locked: false, ipm_unlock_date: null })
    .eq('ipm_locked', true)
    .lte('ipm_unlock_date', today);
}
```

---

## UI PAGES TO BUILD

### 1. Morning Dashboard (Home Screen)
- Today's date and greeting
- Section: 🔴 Overdue Tasks (red cards)
- Section: 🟡 Due Today (yellow cards)
- Section: 📦 Low Stock Alerts
- Section: 🔒 IPM Locks expiring today
- Section: 🔵 Upcoming this week (preview)
- Quick-add buttons: [+ New Batch] [+ Record Sale] [+ Log Expense]

### 2. Crop Library
- List of all crops with category badges
- Click to view/edit full crop details
- [+ Add Crop] button

### 3. Batches
- Active batches as cards showing: crop name, batch code, zone, stage badge with progress bar, days until harvest
- Filter by: zone, stage, crop category
- Click batch → full detail view with history log
- [+ New Batch] button with inventory deduction confirmation

### 4. Task Manager
- List view sorted by: Overdue → Today → Upcoming
- Filter by: Status, Batch, Date
- Tap to change status (Pending → In Progress → Completed)
- [+ Add Manual Task] option

### 5. Inventory
- List of all items with current qty vs threshold
- Red highlight for low-stock items
- [+ Add Item] and [Restock] buttons
- Full inventory log / audit trail per item

### 6. Point of Sale (POS)
- 4 large mode buttons: Per Gram / Potted Plant / Seedling / Runner
- Crop selector (from active batches)
- Quantity input + unit price (auto-filled from crop defaults, editable)
- Customer selector (optional)
- Discount auto-applied for wholesale customers
- Running cart with subtotals
- [Charge] button → payment method → sale recorded

### 7. Finance
- Period selector: This Week / This Month / Custom
- Cards: Gross Revenue, Total Expenses, Gross Profit, Margin %
- Top earning crops list
- Top expense categories
- Recent transactions list (sales + expenses)
- [+ Add Expense] button

### 8. Fertilizer & Nutrients
- Sub-tab: Mixing Log | Application Log
- Mixing log form + history table
- Feeding log form + history table

### 9. IPM (Pest & Disease)
- Sub-tab: Scouting Log | Treatment Records
- Scouting form + history
- Treatment form (auto-calculates safe harvest date) + history
- Locked batches panel

---

## NAVIGATION STRUCTURE

Bottom navigation bar (mobile):
```
🏠 Dashboard | 🌱 Batches | ✅ Tasks | 🛒 POS | ≡ More
```

"More" menu contains:
- Crop Library
- Inventory
- Finance
- Fertilizer & Nutrients
- IPM
- Settings

---

## SEED DATA

Pre-populate the Crop Library with these on first setup:

| Crop | Category | DTM | Germ Days | Harvest Window |
|---|---|---|---|---|
| Sweet Basil | Herb | 30 | 7 | 14 |
| Spearmint | Herb | 40 | 10 | 21 |
| Peppermint | Herb | 40 | 10 | 21 |
| Lemon Thyme | Herb | 45 | 14 | 20 |
| Rosemary | Herb | 60 | 15 | 30 |
| Nasturtium | Edible Flower | 50 | 10 | 30 |
| Viola | Edible Flower | 55 | 12 | 25 |
| Borage | Edible Flower | 50 | 10 | 28 |
| Microgreen Radish | Microgreen | 7 | 2 | 3 |
| Microgreen Sunflower | Microgreen | 10 | 3 | 4 |

---

## KEY BUSINESS RULES

1. A batch with `ipm_locked = true` CANNOT be marked 'Ready' or processed in POS
2. Creating a batch MUST prompt inventory deduction confirmation before saving
3. Tasks must auto-update to 'Overdue' status if due_date < today and status ≠ 'Completed'
4. POS sales must link to a batch (for COGS tracking) — batch selection is required
5. Wholesale customers (type = 'Wholesale') get their discount automatically applied in POS
6. All currency is Philippine Peso (₱ / PHP)
7. EC is measured in mS/cm, pH in standard scale, temperature in °C

---

## DESIGN REQUIREMENTS

- Mobile-first, large tap targets (minimum 44px)
- Green/earthy color palette reflecting the farm context
- Fast load — the operator uses this daily in the morning, often in the garden
- Clear visual hierarchy: critical alerts (red) > due today (amber) > normal (green/white)
- Offline-capable if possible (PWA service worker for task viewing)
- Simple onboarding: on first launch, prompt to add first crop and first batch

---

*End of prompt. Build Phase 1 first (Dashboard + Crop Library + Batches + Tasks), then proceed to remaining phases.*
