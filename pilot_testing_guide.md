# Elgreensyde v3.2 Pilot Testing Guide

To ensure the system works flawlessly before relying on it entirely in production, we need to run a **User Acceptance Test (UAT)**. A pilot test involves simulating a "day in the life" of the farm, deliberately pushing the system to its limits, and attempting to trigger failures (edge cases).

Follow this step-by-step checklist to systematically hunt for bugs.

---

## 📱 Phase 1: Mobile UI & PWA Armor Check
*Since you operate on an iPhone PWA, testing mobile interactions is critical.*

- [checked ] **The "Fat Finger" Test:** Open the app on your phone. Tap buttons quickly. Ensure the UI doesn't accidentally zoom in or highlight blue text (verifying our `select-none` armor).
- [ checked] **The Global Dialog Test:** Go to any module (e.g., Inventory or Tasks). Attempt to delete a record. Verify the new custom `GlobalDialog` slides up properly and actually deletes the item when confirmed.
- [checked ] **Scrolling Test:** Open long pages (like `Batches` or `Tasks`). Ensure the screen scrolls smoothly and that the bottom navigation bar doesn't cover up the last item on the list.
- [check ] **Smart Assistant Overlay:** Tap the floating emerald AI button. Ensure it opens the context-aware protocol sheet. Navigate to `/batches` and click it again—does it shift to the "Land Preparation" protocols?

---

## 👨‍🌾 Phase 2: The Core Agronomic Loop (The Brain)

- [checked ] **Weather & Thresholds:** Open the `More > Weather` dashboard. Verify that the current VPD and Disease Radar numbers populate instead of showing "Loading...". 
- [ ] **Task Auto-Generation:** Go to `Farm Walk` and wait 48 hours (or temporarily change your computer's clock forward 2 days). Refresh the dashboard. Did the `"Greenhouse Scouting Needed"` task automatically generate?
- [ ] **Inventory Deductions:**
    1. Check your current stock of `FERT-14-14-14` in the Inventory page.
    2. Go to the Tasks page and complete a "Prep Bed Nutrition" task.
    3. Return to the Inventory page. Did it accurately automatically deduct `45g` (0.045kg)?
 When I go task page I created a manual task and rename it to prep bed nutrition but it shows not showing the fertilizer deduction.
---

## 🪴 Phase 3: The Lifecycle Pipeline (Batches & Plots)

- [checked] **Nursery Creation:** Add a new tray for "Sweet Basil". Verify that the system automatically assigns exactly a 14-day germination/target transplant offset.
- [checked ] **The Transplant Flow:** Click the "Transplant & Assign" button on a Ready tray. Assign it to an empty Plot. Ensure the tray moves to "Completed" and the Plot becomes "Active" with the correct crop.
- [ ] **The Fusarium Guard (CRITICAL):** I dont see this:
    1. Assign "Sweet Basil" to Plot A.
    2. Edit/Clear Plot A, then attempt to assign "Sweet Basil" to it *again* consecutively. 
    3. **Bug Hunt:** Force save it. Does the system successfully block you and display the red Fusarium warning?
- [ ] **Harvest Math:** Log a harvest on an active plot. Enter a Yield Weight and Cull Weight. Verify that the Plot's "Total Yield" accurately sums up the math.

---

## 📦 Phase 4: Logistics & POS

- [ ] **Minimum Order Warnings:** In the POS/Orders section, attempt to build an order below your minimum required weight or value threshold (if applicable). Does the prompt correctly warn you?
- [ ] **Fulfillment Stock Deductions:** Move an order item to "Fulfilled" status. Check the master inventory to ensure the final product count decreased accordingly.
- [ ] **Finance Ledger Sync:** After fulfilling an order, check the Finance/Ledger module. Verify that the sale automatically recorded as a Revenue entry with the correct timestamps.

---

## 🐛 How to Report Bugs Discovered
If you find a bug during this pilot test, try to answer these 3 questions when reporting it back to me:
1. **What did you tap?** (e.g., *I pressed complete on a Sweet Basil harvest task*) I click Harvest
2. **What did you expect to happen?** (e.g., *I expected it to disappear*) I expected it to show in Inventory
3. **What actually happened?** (e.g., *The screen froze, or it duplicated the task*)nothing happens

1. **What did you tap?** (e.g., *I pressed complete on a Sweet Basil harvest task*) I click Orders
2. **What did you expect to happen?** (e.g., *I expected it to disappear*) I expected it to create an order but i can put it because it reqires customer but i cannot find it
3. **What actually happened?** (e.g., *The screen froze, or it duplicated the task*)nothing happens, I closed it.
