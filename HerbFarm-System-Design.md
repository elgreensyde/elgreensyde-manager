# 🌿 Herb & Edible Flower Farm — Management System Design
**Owner:** Solo Operator | **Location:** Cagayan de Oro, Philippines
**Growing Setups:** Pots/Containers, Raised Beds, Hydroponics
**Sales Channels:** Walk-in Farm Buyers, Online Orders/Delivery

---

## OVERVIEW

This document defines the full system architecture for a solo-operated herb and edible flower farm. The goal is to eliminate morning confusion by replacing "everything in my head" with a structured, digital management system that auto-generates daily tasks, tracks every batch from seed to sale, manages supplies, and shows financial health at a glance.

The system is a **single web application** (or mobile-first PWA) divided into 7 core modules, all connected through a shared database.

---

## HOW THE MODULES CONNECT

```
Crop Library (rules engine)
        │
        ▼
Batch Created ──► Auto-generate Tasks ──► Daily Task Dashboard
        │
        ├──► Deducts from Inventory (seeds, pots, soil)
        │
        ├──► Triggers Fertilizer/Nutrient Schedule
        │
        ├──► IPM Log can LOCK batch (withholding period)
        │
        └──► Batch marked "Ready" ──► POS / Sales
                                          │
                                          ▼
                                    Finance Module
                                 (Revenue recorded)
```

Every action flows from a batch. A batch is the central unit of the entire system.

---

## MODULE 1 — CROP LIBRARY (The Rules Engine)

**Purpose:** The master reference that defines how every crop behaves. All automatic task generation and stage tracking pulls from this library.

### Data Fields Per Crop

| Field | Description | Example |
|---|---|---|
| Common Name | Display name | Sweet Basil |
| Scientific Name | For edible flowers especially | Ocimum basilicum |
| Category | Microgreen / Herb / Edible Flower / Vegetable | Herb |
| Days to Maturity (DTM) | From seed/transplant to first harvest | 30 days |
| Germination Days | Expected sprout time | 7 days |
| Harvest Window | How many days the crop stays harvestable | 14 days |
| EC Min / EC Max | Target electrical conductivity (hydroponics) | 1.6 – 2.2 mS/cm |
| pH Min / pH Max | Target pH range | 5.5 – 6.5 |
| Sunlight Requirement | Full Sun / Partial Shade / Indirect | Full Sun |
| Ideal Temperature | °C range | 24 – 30°C |
| Humidity | % range | 60 – 80% |
| Yield per Pot / Tray | For inventory forecasting | 15g per 4" pot |
| Notes | Special care instructions | Pinch flowers to extend harvest |

### Auto-Stage Logic (Driven by Crop Library)

When a batch is created with a planting date, the system uses DTM and germination days to automatically calculate and display the current stage:

- **Stage 1 – Germinating:** Day 0 to Germination Days
- **Stage 2 – Seedling:** Germination Days to 30% of DTM
- **Stage 3 – Vegetative:** 30% to 80% of DTM
- **Stage 4 – Pre-Harvest:** 80% to 100% of DTM
- **Stage 5 – Ready to Harvest:** DTM reached, within Harvest Window
- **Stage 6 – Overdue/Past Window:** Beyond Harvest Window (alert)

---

## MODULE 2 — INVENTORY SYSTEM

**Purpose:** Know exactly what supplies you have before you run out. No more mid-task discoveries of empty seed packets.

### Inventory Categories

**Hard Goods** (reusable or slow-consumed)
- Nursery trays (200-cell, 72-cell, flat)
- Pots (2", 4", 6", 8", grow bags)
- Packaging materials (kraft bags, clamshells, labels)
- Shade nets
- Grow lights / timers (equipment log only)

**Consumables** (depleted with each use)
- Coco coir (tracked in kg)
- Potting mix (tracked in liters or kg)
- Rockwool cubes (tracked by count)
- Seeds (tracked by weight in grams or count)
- Packaging labels

**Fertilizers & Chemicals** (see also Module 6)
- Masterblend, Calcium Nitrate, Magnesium Sulfate
- Organic composts, foliar sprays
- IPM treatments (neem oil, biological controls)

### Low-Stock Alert System

Each item has a **Minimum Threshold** set by the user. When current quantity falls at or below the threshold, the item appears on the **Morning Dashboard** as a red alert. Example:

| Item | Current Qty | Min Threshold | Status |
|---|---|---|---|
| Basil Seeds | 8g | 20g | 🔴 LOW STOCK |
| 4" Pots | 65 pcs | 50 pcs | ✅ OK |
| Kraft Bags | 12 pcs | 30 pcs | 🔴 LOW STOCK |

### Automatic Deduction

When a new batch is created, the system prompts: "This will use X pots, Y grams of seed, Z liters of soil — confirm?" On confirmation, inventory is automatically deducted.

---

## MODULE 3 — CROP MANAGEMENT (Batch & Task Tracker)

**Purpose:** The operational heart of the system. Every plant group is a **Batch**. Every batch generates tasks. Every morning you open the app and see exactly what to do.

### Batch Record Fields

| Field | Description |
|---|---|
| Batch ID | Auto-generated (e.g., B-2025-047) |
| Crop | Linked from Crop Library |
| Planting Date | Date seed was sown or cutting was taken |
| Quantity | Number of pots, trays, or plants |
| Growing Zone | Hydroponic Bay A / Raised Bed 1 / Pot Bench 2 |
| Current Stage | Auto-calculated from Crop Library rules |
| Status | Active / Ready to Harvest / Harvested / Sold / Discarded |
| IPM Lock | Yes/No — locked if within withholding period |
| Notes | Free text observations |

### Auto-Generated Task Templates

When a batch is created, the system schedules these tasks automatically based on the crop's DTM:

| Trigger | Auto-Task Created |
|---|---|
| Day 0 (planting) | "Sow seeds — Batch B-047, Zone: Hydro Bay A" |
| Germination Day | "Check germination — Batch B-047" |
| Seedling Stage | "Thin seedlings — Batch B-047 if overcrowded" |
| Vegetative Stage | "Move to full sun — Batch B-047" |
| Pre-Harvest | "Check EC/pH — Batch B-047 (Hydroponic)" |
| DTM Reached | "Harvest ready — Batch B-047 (Sweet Basil, 15g/pot)" |
| Harvest Window End | "⚠️ OVERDUE — Harvest or discard Batch B-047" |

### Task Status Flow

```
PENDING ──► IN PROGRESS ──► COMPLETED
    │
    └──► OVERDUE (if not completed by scheduled date)
```

### Daily Task Dashboard (The Morning View)

Sorted by priority every morning:

1. 🔴 **OVERDUE** tasks (do these first)
2. 🟡 **DUE TODAY** tasks
3. 🔵 **UPCOMING** (next 3 days preview)
4. 🔴 **LOW STOCK ALERTS** from Inventory
5. 🔴 **IPM WITHHOLDING** batches expiring today

### Batch History Log

Every action on a batch is timestamped and saved:
```
B-047 Sweet Basil | History:
[Mar 15] Sown — 20 pots, Pot Bench 2
[Mar 22] Germination confirmed — 18/20 sprouted
[Mar 28] Thinned seedlings
[Apr 02] Moved to full sun position
[Apr 10] Neem oil applied — LOCKED (7-day withholding)
[Apr 17] Withholding cleared — Ready to Harvest
[Apr 18] Harvested — 280g total
[Apr 18] Sold — Walk-in, ₱350
```

---

## MODULE 4 — FINANCE (Revenue & Expenses)

**Purpose:** Know if your farm is actually profitable, not just busy.

### Revenue Tracking

Every sale from the POS module automatically records:
- Date, crop name, batch ID
- Sale type (per gram / potted plant / seedling / runner)
- Quantity, unit price, total
- Customer (if tagged)
- Payment method (cash / GCash / bank transfer)

### Expense Categories

| Category | Examples |
|---|---|
| Seeds | Basil seeds, viola seeds |
| Fertilizers & Nutrients | Masterblend, coco coir, compost |
| Packaging | Kraft bags, labels, clamshells |
| Equipment | Trays, pots, tools, irrigation parts |
| Utilities | Water bill, electricity (esp. hydroponics) |
| Labor | If you hire help in the future |
| Transport | Delivery costs, market stall fees |
| Miscellaneous | Any other farm cost |

### Cost of Goods Sold (COGS) Calculation

The system tracks the cost to produce one unit:

```
COGS per pot =
  (Cost of seeds used)
  + (Cost of soil/coco coir used)
  + (Cost of pot)
  + (Cost of nutrients applied to batch)
  + (Cost of IPM treatments applied)
  ÷ Number of pots in batch
```

This is calculated per batch so you know your actual margin on each crop.

### Profit & Loss Dashboard

Selectable period (weekly / monthly / by season):

```
GROSS REVENUE         ₱ 12,400
Total Expenses        ₱  4,820
────────────────────────────────
GROSS PROFIT          ₱  7,580
Profit Margin              61%

Top Earner:     Sweet Basil  ₱3,200
Highest Cost:   Hydroponics  ₱1,100 (utilities)
```

---

## MODULE 5 — POINT OF SALE (POS)

**Purpose:** Fast checkout for walk-in buyers and easy logging for online orders.

### 4 Selling Modes (Quick-Tap Interface)

| Mode | Unit | Example Price |
|---|---|---|
| Per Gram | g | ₱15/g |
| Potted Plant | per pot | ₱85/pot |
| Seedling | per seedling | ₱25/seedling |
| Runner | per runner | ₱30/runner |

### Transaction Flow

1. Tap crop name → tap selling mode → enter quantity
2. System shows: item, qty, unit price, subtotal
3. Add more items or apply discount
4. Tap "Charge" → enter payment method
5. Sale recorded → inventory updated → finance updated automatically

### Customer Profiles (Optional)

Tag buyers to track purchase history:
- **Walk-in Regular** (name + contact)
- **Wholesale Client** (restaurant/cafe name, special pricing tier)
- **Online Customer** (name + delivery address)

Wholesale clients automatically get their pre-set discount applied at checkout.

### Discount & Pricing Tiers

| Tier | Discount | Applied To |
|---|---|---|
| Retail | 0% | Walk-in, online |
| Regular Buyer | 10% | Tagged regulars |
| Wholesale | 20–30% | Restaurants, cafes |
| Bulk Order | Custom % | Set per transaction |

---

## MODULE 6 — FERTILIZER & NUTRIENT MANAGEMENT

**Purpose:** Precision feeding for hydroponics; consistent care for soil-grown plants.

### Nutrient Inventory

Tracked under the Inventory module with its own sub-category. Each nutrient shows:
- Current stock (kg or liters)
- Low-stock threshold
- Last purchase date and cost per kg

### Hydroponic Mixing Log

Every time you mix a nutrient solution, record it:

| Field | Example |
|---|---|
| Date | Apr 1, 2025 |
| Recipe Name | Masterblend Standard (Veg) |
| Volume Mixed | 20 liters |
| Masterblend | 12g |
| Calcium Nitrate | 11g |
| Magnesium Sulfate | 6g |
| Target EC | 1.8 mS/cm |
| Target pH | 6.0 |
| Actual EC (measured) | 1.7 mS/cm |
| Actual pH (measured) | 6.1 |
| Applied To | Hydro Bay A — Basil, Mint |
| Notes | Slightly low EC, adjusted with 2g extra MB |

### Application Log (All Zones)

Every feeding event across all growing setups:

| Date | Zone/Batch | What Applied | Dosage | EC After | pH After |
|---|---|---|---|---|---|
| Apr 1 | Hydro Bay A | Masterblend Mix | 20L | 1.8 | 6.0 |
| Apr 1 | Pot Bench 2 | Compost tea | 2L/pot | — | — |
| Apr 3 | Raised Bed 1 | Organic fert | 500g broadcast | — | — |

---

## MODULE 7 — PEST & DISEASE MANAGEMENT (IPM)

**Purpose:** Log all pest and disease events. Enforce safe withholding periods before a batch can be sold.

### Scouting Log

Record what you observe during routine checks:

| Date | Zone / Batch | Pest / Disease Observed | Severity | Action Taken |
|---|---|---|---|---|
| Apr 5 | Hydro Bay B | Aphids | Low | Removed manually |
| Apr 7 | Pot Bench 2 | Powdery mildew | Medium | Treatment applied |
| Apr 9 | Raised Bed 1 | Spider mites | High | Neem oil spray |

Severity levels: Low / Medium / High / Critical

### Treatment Record

| Field | Example |
|---|---|
| Date Applied | Apr 9, 2025 |
| Batch / Zone | Raised Bed 1 — Lemon Thyme |
| Treatment Used | Neem oil 2% solution |
| Volume Applied | 1.5 liters |
| Method | Foliar spray |
| Withholding Period | 7 days |
| Safe to Harvest After | Apr 16, 2025 |
| Applied By | (Your name) |

### Withholding Period Lock

This is the most critical safety feature:

- When a treatment is logged on a batch, the batch status is automatically set to **🔒 LOCKED — Withholding Period**
- The batch CANNOT be marked "Ready to Sell" or processed through POS while locked
- A countdown is shown: "Unlocks in 4 days (Apr 16)"
- On the unlock date, the system sends an alert: "✅ Batch B-031 withholding cleared — Ready to Harvest"
- The full treatment history stays on the batch record permanently for food safety traceability

---

## DATA SCHEMA SUMMARY

These are the core tables/collections the database needs:

```
crops              — Crop Library records
batches            — Each growing batch
tasks              — Auto-generated and manual tasks
inventory_items    — All supplies and materials
inventory_log      — Every deduction/addition event
sales              — Every POS transaction
expenses           — Every cost recorded
customers          — Buyer profiles
nutrient_mixes     — Mixing log records
feeding_log        — Application log records
ipm_scouting       — Pest/disease observations
ipm_treatments     — Treatment records (with withholding dates)
```

---

## RECOMMENDED TECH STACK

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Fast, mobile-friendly |
| Backend | Node.js + Express OR Supabase | Simple REST API |
| Database | PostgreSQL (via Supabase) | Relational, free tier available |
| Auth | Supabase Auth | Simple, built-in |
| Hosting | Vercel (frontend) + Supabase (backend/db) | Free to start |
| Mobile | PWA (add to home screen) | No app store needed |

---

## BUILD PRIORITY ORDER

Build in this sequence so each phase is immediately useful:

### Phase 1 — Fix Morning Chaos (Build First)
1. Crop Library (basic fields + DTM rules)
2. Batch Tracker (create batch, auto-stage calculation)
3. Daily Task Dashboard (auto-generated tasks, overdue alerts)

### Phase 2 — Stop Running Out
4. Inventory System (items + low-stock alerts)
5. Auto-deduction when batch is created
6. Fertilizer & Nutrient logs

### Phase 3 — Track Your Money
7. POS (quick sale entry, 4 selling modes)
8. Expense logging
9. Finance dashboard (P&L)

### Phase 4 — Protect Your Plants
10. IPM Scouting & Treatment logs
11. Withholding period lock system
12. Customer profiles & discount tiers

---

*Document Version 1.0 — Designed for solo farm operator, Cagayan de Oro*
