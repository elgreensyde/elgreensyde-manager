# Elgreensyde Management System v2.0
## comprehensive System Features & Functionality Document

**Application Type:** React Single Page Application (Vite + TailwindCSS)
**Database / Backend:** Supabase (PostgreSQL)
**Theme:** Light & Cute Design Aesthetics (`Plus Jakarta Sans`, `Fredoka`, `Courier Prime`)

---

## 1. Cultivation Pipelines
The system employs a rigid "Three-Tiered Pipeline" to accommodate Elgreensyde's diverse crop types.

### Seed & Germination (Trays)
- **Features:** Tracts seeds sown in propagation trays. Tracks media type (e.g., Peat Moss).
- **Automation:** Evaluates target transplant dates. Once completed, a `Tray` is graduated and explicitly assigned to a generic `Plot` or `Batch`.

### Pipeline A: Plot-to-Gram (Microgreens, Leafy Greens)
- **Concept:** Growing areas (Beds, NFT channels, or generalized Plots) that produce yielding cut-weights.
- **Workflow:** 
  1. Plot gets generic auto-generated ID (e.g., `BED-1342`).
  2. Crop grows over its maturity window.
  3. **Harvest Logs:** Users log continuous gram yields or cull weights taken directly from the Plot.
  4. Once depleted, the plot is set to `Ready to Clear`.

### Pipeline B: Nursery-to-Unit (Potted Herbs, Edible Flowers)
- **Concept:** Crops sold as individualized units (pots/plugs) rather than weight.
- **Workflow:** 
  1. Batch established with an Initial Quantity.
  2. Seedlings suffer mortality; users log 'Mortality Count'.
  3. Survivors graduate continuously to `Market Ready Quantity`.
  4. Units are pushed straight to the `Live Inventory`.

---

## 2. Point of Sale (POS) Engine
A highly detailed desktop-grade POS interface for executing walk-in or tracked customer sales.

- **Fast Interface:** Split screen view featuring a categorized catalog (Units vs. Grams format) and a search-filtered grid.
- **Dynamic Pricing & Overrides:** Allows administrators to override the retail price of any single product on the fly via the `Set Price` modal wrapper.
- **Advanced Cart Checkout:**
  - Standard Itemization (Calculates Quantity × Unit Price).
  - Discount Math (Supports precise flat `₱ Off` deductions or percentage `% Off` scaling).
  - Configurable Shipping logic.
  - Tender Check (Accepts raw cash amounts and auto-calcs `Change`).
- **Live Receipt Engine (`html2canvas`):** Generates a pixel-perfect snapshot of a printable 58mm/80mm style Courier-formatted thermal receipt, automatically calculating Date/Time, Order Number, line items, and totals. Exportable to raw PNG.
- **Sales History:** Quick-access modal to reverse-lookup transactions that were piped deeply into the system's ledger.

---

## 3. Passive Auto-Task Engine & Alerts
A decoupled background engine (`runDailyTaskGeneration`) that passively interrogates the state of the farm every time the dashboard loads. It aggressively auto-queues work for the user.

- **Overgrowth Protection:** Detects active `Plots` that haven't been harvested in 14+ days and generates an inspection task.
- **Batch Maturity:** Detects potted `Batches` sitting in *Nursery* status that have exceeded their designated `days_to_maturity`, prompting the user to classify them into the Market Ready grid.
- **Low Inventory Alert:** Flags SKUs actively plunging below their defined `restock_alert_level`.

---

## 4. Unified Maintenance Log
An automated record keeping log specifically for fertilizers and Integrated Pest Management (IPM).

- **Multi-Plot Batching:** Allows a farm-hand to select *multiple* targets simultaneously (e.g., PLT-1, PLT-2, BCH-A) from a checklist and blanket-log a specific "Drench" or "Spray" treatment.
- **Rich Context Logging:** Tracks exactly what `Method/Product` was used, at what `Dosage Rate`, with an open box for contextual notes.

---

## 5. Live Inventory
- Real-time stock aggregator representing the total saleable assets of Elgreensyde.
- Deducts continuously in tandem via cart fulfillments executing from the `POS Module`.
- Configurable formats (`Units` vs `Grams`) changing how the cart interprets checkout weight/counts.

---

## 6. Zero-Friction Accounting (Ledger)
- **Passive Bookkeeping:** Completed `POS` sales immediately log structured Revenue payloads against the internal `financial_ledger`.
- **Manual Adjustments:** Direct input screen for Logging Costs (Inputs, Utilities) against Revenue to actively track the aggregate Net P&L.
- **Taggable IDs:** Every financial pulse is optionally linked to a unique `Customer ID` for deep CRM insights.
