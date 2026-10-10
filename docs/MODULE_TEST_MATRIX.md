# TextileFlow — Module & Component Test Matrix

This test matrix contains the detailed execution and verification results for every module, API route, form, and workflow tested during the audit against the live application and shared Supabase database.

---

## 1. System Health & Infrastructure

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-SYS-01** | Backend Health & Supabase DB Connectivity | Express on port 5000, Supabase configured in `.env` | `GET /api/health` | Returns HTTP 200, status `healthy`, database `connected: true`. | HTTP 200, `database.connected: true`, database provider `Supabase PostgreSQL`. | **PASS** | `GET /api/health` -> HTTP 200, response time 42ms. | None. Verified. |
| **TC-SYS-02** | Frontend Vite Production Build | Node.js, Vite build runner | `npm run build` in `frontend` | Production assets bundled without syntax errors or broken imports. | Bundled in 2.33s without errors or warnings (`dist/` generated). | **PASS** | Vite output: 1923 modules transformed, 0 errors. | None. Clean compilation. |
| **TC-SYS-03** | Monolithic Single-Server Architecture | Project files in `backend/` and `frontend/` | Inspect network tab and API client | All requests route to single port 5000 or Vite proxy `/api`. | All modules routed through monolithic Express server on port 5000. | **PASS** | [index.js](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/backend/src/routes/index.js) mounts all modules on single Express router. | None. Verified. |

---

## 2. Raw Material Inventory & Procurement

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-INV-01** | Stock Integrity — Arbitrary Overwrite Disallowed | Product with currentStock = 200.0 | `PUT /api/inventory/products/:id` with `{ currentStock: 9999.0 }` | Metadata updates, but stock quantity is not overwritten. | Metadata updated; `currentStock` remains exactly 200.0 in DB. | **PASS** | DB query: `refreshedProduct.currentStock === 200.0`. | None. Rule enforced in [inventory.service.js](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/backend/src/services/inventory.service.js). |
| **TC-INV-02** | Manual Product Creation Stripped from UI | Open Inventory view in frontend | Inspect UI for "Add Product" button or creation modal | No manual product/stock creation modal present in UI. | Button and modal removed; info banner explains stock intake via PO. | **PASS** | [InventoryView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/InventoryView.jsx) contains no manual creation button. | None. Verified. |
| **TC-INV-03** | Low Stock Alerts | Product with `currentStock <= minimumStock` | `GET /api/inventory/low-stock` | Returns list of products below minimum stock. | Returns active items with stock <= minimum threshold. | **PASS** | HTTP 200, returns array of low stock products. | None. Verified. |
| **TC-PUR-01** | Purchase Order Creation Leaves Stock Untouched | Raw material Yarn `YRN-01` with stock = 100 kg | Create PO for 200 kg via `POST /api/purchase/orders` | PO created with status `ORDERED`; stock remains 100 kg. | PO created; product `currentStock` remains exactly 100 kg. | **PASS** | DB verified: stock unchanged upon PO creation. | None. Rule verified. |
| **TC-PUR-02** | Goods Receipt Increases Stock Exactly Once | PO `PO-2026-0001` with 50 kg ordered | `POST /api/purchase/orders/:id/receive` with 50 kg | Stock increments by 50 kg; `InventoryTransaction` logged. | Stock increased by 50 kg; PO status became `RECEIVED`. | **PASS** | `InventoryTransaction` logged with `type: PURCHASE_RECEIPT`. | None. Verified. |
| **TC-PUR-03** | Over-receiving Rejection | PO line item with 50 kg ordered, 50 kg already received | Attempt to receive another 10 kg | Request rejected with 400 Bad Request. | Error returned: "Cannot receive 10. Outstanding quantity is 0". | **PASS** | HTTP 400 error returned by `receiveGoods`. | None. Over-receiving protected. |

---

## 3. Buyer Management & Order Progress

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-BUY-01** | Buyer Phone Number — Reject < 10 Digits | Customer payload with phone `98765` (5 digits) | `POST /api/sales/customers` | Rejected with 400 Bad Request. | Rejected with 400: "Phone number must contain exactly 10 numeric digits". | **PASS** | `test-buyer-finance.js` Test 1: HTTP 400. | None. Verified. |
| **TC-BUY-02** | Buyer Phone Number — Reject Alphanumeric | Customer payload with phone `987654321A` | `POST /api/sales/customers` | Rejected with 400 Bad Request. | Rejected with 400: "Phone number must contain exactly 10 numeric digits". | **PASS** | `test-buyer-finance.js` Test 1: HTTP 400. | None. Verified. |
| **TC-BUY-03** | Buyer Phone Number — Accept Exactly 10 Digits | Customer payload with phone `9876543210` | `POST /api/sales/customers` | Accepted with 201 Created. | Customer created with phone `9876543210`. | **PASS** | `test-buyer-finance.js` Test 1: HTTP 201. | None. Verified. |
| **TC-BUY-04** | Delivery Deadline — Reject Past Date | Order payload with deadline in 2020 | `POST /api/sales/orders` | Rejected with 400 Bad Request. | Rejected with 400: "Delivery deadline cannot be in the past". | **PASS** | `test-buyer-finance.js` Test 2: HTTP 400. | None. Verified. |
| **TC-BUY-05** | Real-time Floor Stage Tracking | Sales Order linked to production | Query derived stage from floor records | Stage derived from actual logs without manual dropdown | Stage evaluates accurately (`MATERIAL_CHECKED` / `MANUFACTURING_IN_PROGRESS` / `READY_FOR_DISPATCH`) | **PASS** | `test-buyer-finance.js` Test 3. | None. Verified. |
| **TC-BUY-06** | Buyer Profile Financial Summary | Active buyer with orders | Query buyer by ID (`GET /api/sales/buyers/:id`) | Displays orders and aggregated invoiced, paid, and balance due | Profile returns full order history and financial aggregates. | **PASS** | `test-buyer-finance.js` Test 4. | None. Verified. |

---

## 4. Manufacturing & Quality Control

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-MFG-01** | Material Requirement vs Available Stock Check | Production order requiring 100 kg yarn; only 10 kg in stock | `GET /api/manufacturing/materials/requirement-vs-available/:id` | Flags shortage as `SHORT` with shortage quantity = 90 kg. | Returns `shortage: 90`, `status: "SHORT"`. | **PASS** | `smoke-factory.js` Step 3: HTTP 200, status `SHORT`. | None. Verified. |
| **TC-MFG-02** | Sequential Stage Progression | Production order in `SPINNING` | Start stage -> Complete stage | Raw yarn deducted atomically; order advances to `WEAVING`. | Raw yarn deducted (100 kg); order stage updated to `WEAVING`. | **PASS** | `smoke-factory.js` Step 4: stage log closed. | None. Verified. |
| **TC-MFG-03** | Final Stage Output Increments Finished Goods | Complete `FINISHING` stage with 180 meters output | `POST /orders/:id/stages/complete` for FINISHING | Finished goods inventory stock incremented by 180 meters. | Finished product stock increased by 180; order marked `COMPLETED`. | **PASS** | `smoke-factory.js` Step 4: finished goods +180 meters. | None. Verified. |
| **TC-QC-01** | Log Roll Inspection with Defect Tagging | Production order completed with 180 meters | `POST /api/quality/inspections` with roll number, meters, defect type `HOLES` | Inspection saved with status `REJECTED`, defect record linked. | Saved in `quality_inspections` and `defect_records`. | **PASS** | `smoke-factory.js` Step 5: HTTP 201. | None. Verified. |
| **TC-QC-02** | Dispatch Gate — Block Dispatches Exceeding Passed Rolls | 4 rolls inspected (2 PASSED, 1 REWORK, 1 REJECTED); requested = 5 | `POST /api/dispatch` with 5 rolls | Rejected with 409 Conflict. | Rejected with 409: "Cannot dispatch 5 rolls. Only 2 passed rolls are dispatch-ready". | **PASS** | `smoke-factory.js` Step 7: HTTP 409. | None. Quality guard enforced. |

---

## 5. Dispatch & Logistics

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-DSP-01** | Dispatch Confirmation & Single Stock Deduction | Sales order for 120 meters; warehouse stock = 200 meters | `POST /api/dispatch` with vehicle, destination, 2 rolls | Dispatch created; stock decremented by 120 to 80. | Dispatch status `DISPATCHED`; stock deducted exactly once to 80.0. | **PASS** | `test-business-rules.js` Test 4b/4c: stock = 80.0. | None. Verified. |
| **TC-DSP-02** | Duplicate Dispatch Rejection & Double Deduction Guard | Sales order already dispatched | Attempt second dispatch with same `salesOrderId` | Rejected with 409 Conflict; stock not deducted again. | Rejected with 409: "Duplicate dispatch prohibited"; stock remains 80.0. | **PASS** | `test-business-rules.js` Test 4f: HTTP 409, stock = 80.0. | None. Verified. |
| **TC-DSP-03** | Insufficient Stock Rejection | Sales order for 150 meters; warehouse stock = 80 meters | `POST /api/dispatch` | Rejected with 409 Conflict. | Rejected with 409: "Insufficient stock. Required: 150, Available: 80". | **PASS** | `test-business-rules.js` Test 4g: HTTP 409. | None. Verified. |

---

## 6. Central Transactions Module

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-TX-01** | Unified Financial Ledger Aggregation | Multiple financial operations recorded | `GET /api/transactions` | Aggregates all invoices, buyer receipts, bills, and wage payouts | Returns unified ledger with date, ref, type, amount, party, status | **PASS** | `test-buyer-finance.js` Test 12. | None. Verified. |
| **TC-TX-02** | Ledger Date & Type Filtering | Ledger containing diverse transaction types | Filter by type `BUYER_PAYMENT` or date range | Returns only matching records and recalculates summary totals | Accurate filtered sublist returned. | **PASS** | Verified via API & UI filters. | None. Verified. |
| **TC-TX-03** | Factory Overhead Expense Logging | Utility / repair voucher | `POST /api/accounting/expenses` | Logs expense in `business_expenses`, visible in transactions ledger | Expense recorded with category, amount, ref, and description. | **PASS** | `test-buyer-finance.js` Test 10. | None. Verified. |

---

## 7. Costing, Accounting & Owner Month-End Closing

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-ACC-01** | Sales Invoice Creation & Line Calculations | Sales order for fabric supply | `POST /api/accounting/invoices` with items, tax, discount | Creates invoice, calculates total, balance = total, status = ISSUED | Invoice created with subtotal, tax, discount, balance = total. | **PASS** | `test-buyer-finance.js` Test 5. | None. Verified. |
| **TC-ACC-02** | Duplicate Invoice Prevention | Invoice already issued for sales order | Attempt to create second invoice for same order | Rejected with 400 Bad Request | Rejected with 400: "Invoice already issued for sales order". | **PASS** | `test-buyer-finance.js` Test 5. | None. Enforced. |
| **TC-ACC-03** | Partial Buyer Payment & Balance Reduction | Invoice for ₹72,000 | Record payment of ₹40,000 | Balance reduced to ₹32,000; status = PARTIALLY_PAID | Paid amount updated to ₹40,000; balance = ₹32,000. | **PASS** | `test-buyer-finance.js` Test 6. | None. Verified. |
| **TC-ACC-04** | Overpayment Rejection | Remaining invoice balance = ₹32,000 | Attempt payment of ₹50,000 | Rejected with 400 Bad Request | Rejected with 400: "Payment amount exceeds remaining balance". | **PASS** | `test-buyer-finance.js` Test 7. | None. Enforced. |
| **TC-ACC-05** | Duplicate Payment Reference (Idempotency) | Payment recorded with reference `NEFT-AXIS-XXXX` | Repeat submission with same reference | Rejected with 400 Bad Request | Rejected with 400: "Payment with reference has already been recorded". | **PASS** | `test-buyer-finance.js` Test 7. | None. Enforced. |
| **TC-ACC-06** | Final Settlement Payment | Remaining invoice balance = ₹32,000 | Record payment of ₹32,000 | Balance reduced to ₹0; status transitions to PAID | Balance = ₹0; status = PAID. | **PASS** | `test-buyer-finance.js` Test 8. | None. Verified. |
| **TC-ACC-07** | Supplier Bill & Settlement | Raw yarn inward delivery | Create bill for ₹47,250 and settle payment | Bill created, then settled to PAID with balance = ₹0 | Supplier bill created, paid, and balance reduced to ₹0. | **PASS** | `test-buyer-finance.js` Test 9. | None. Verified. |
| **TC-ACC-08** | Order Manufacturing Costing | Sales order with consumption & labor | `GET /api/accounting/orders/:id/costing` | Computes raw material unit costs + shift labor allocation + margin % | Returns order costing breakdown and gross margin %. | **PASS** | `test-buyer-finance.js` Test 11. | None. Verified. |
| **TC-ACC-09** | Owner Month-End Closing & P&L Separation | Month selected (`YYYY-MM`) | `GET /api/accounting/owner-summary?month=YYYY-MM` | Strictly separates Accrual Net Profit from Cash Flow | Accrual P&L, Cash Flow, and Working Capital computed from DB records. | **PASS** | `test-buyer-finance.js` Test 13. | None. Verified. |

---

## 8. Machine Daily Output (Phase 3)

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-MDO-01** | Machine Daily Output Retrieval | ProductionStageLog records completed on target date | `GET /api/manufacturing/machines/daily-output?date=YYYY-MM-DD` | Returns 200 OK, machine daily output array, segregated totals by unit | Output returned with machine details, stage output, status, and correct unit (KG/METER) | **PASS** | `test-phase3-phase4.js` Test 3.1: HTTP 200. | None. Verified. |
| **TC-MDO-02** | Prevention of Multi-Stage Double Counting | Order moves across SPINNING (100 KG) and WEAVING (90 METER) | Query daily output on same day | Outputs grouped per machine and stage, preserving segregated units | Separate records for Spinning Machine (100 KG) and Loom (90 METER); no false cross-unit sum | **PASS** | `test-phase3-phase4.js` Test 3.2: Double counting strictly prevented. | None. Verified. |
| **TC-MDO-03** | Date Range & Machine Filtering | Completed logs across multiple dates | `GET /api/manufacturing/machines/daily-output?startDate=X&endDate=Y&machineId=Z` | Returns logs bounded by date range and specific machine | Correct machine filtered; only records within date interval returned | **PASS** | `test-phase3-phase4.js` Test 3.3: HTTP 200. | None. Verified. |
| **TC-MDO-04** | No-Production Day Behavior | Date without any stage completion | `GET /api/manufacturing/machines/daily-output?date=2021-01-01` | Returns machines with status and `totalOutputQuantity: 0`; does not invent records | Returns machines floor status, 0 output, empty production list | **PASS** | `test-phase3-phase4.js` Test 3.4: Real 0 output returned. | None. Verified. |
| **TC-MDO-05** | Invalid Date / Stage Filter Validation | Invalid date string, startDate > endDate, invalid stage enum | Query with invalid query parameters | Handled safely returning 400 Bad Request with descriptive message | 400 Bad Request returned for invalid date, inverted range, and invalid stage | **PASS** | `test-phase3-phase4.js` Test 3.5: Validation guards verified. | None. Verified. |
| **TC-MDO-06** | Machine Daily Output UI View | MachineDailyOutputView component mounted in Factory module | Select date, machine, stage filters; view table & utilization | Displays machine cards, status, unit output cards, utilization progress bar | Rendered with warm-purple theme, loading/empty/error states, responsive layout | **PASS** | Verified via Vite production build & component tests. | None. Verified. |

---

## 9. Shortage-to-Purchase Workflow (Phase 4)

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-STP-01** | Raw Material Shortage Calculation | Active production order needing 200 KG; stock has 50 KG | `GET /api/manufacturing/materials/shortages` | Exposes shortage: 150 KG (Math.max(0, 200 - 50)), unit KG, affected order listed | Detected shortage of 150 KG with unit cost, stock, and requirement breakdown | **PASS** | `test-phase3-phase4.js` Test 4.1: HTTP 200. | None. Verified. |
| **TC-STP-02** | Input Validation Guards | Invalid supplier ID, invalid material ID, zero or negative qty | `POST /api/purchase/orders/from-shortage` with bad data | Rejected with 400/404; database unmutated | Rejected with 404 for bad supplier/product; 400 for non-positive quantity | **PASS** | `test-phase3-phase4.js` Test 4.2: Validation guards verified. | None. Verified. |
| **TC-STP-03** | Safe Purchase Order Creation | Valid shortage of 150 KG with approved supplier | `POST /api/purchase/orders/from-shortage` | PO created with status `ORDERED`; orderNumber generated | PO created with status ORDERED, 1 item for 150 KG | **PASS** | `test-phase3-phase4.js` Test 4.3: HTTP 201 Created. | None. Verified. |
| **TC-STP-04** | Inventory Isolation upon PO Creation | Stock is 50 KG before PO creation | Inspect product stock after PO is created | Stock MUST REMAIN 50 KG (PO creation does NOT increase stock) | Stock remains exactly 50 KG in database; no inventory transaction created | **PASS** | `test-phase3-phase4.js` Test 4.4: Stock strictly untouched. | None. Verified. |
| **TC-STP-05** | Duplicate Request Protection (Idempotency) | User double-clicks "Create Purchase Order" within 60s window | Send duplicate POST request with same supplier & material | Prevents duplicate PO; returns existing PO safely | Duplicate detected; returned existing PO ID; exactly 1 PO in database | **PASS** | `test-phase3-phase4.js` Test 4.5: HTTP 200, no duplicate created. | None. Verified. |
| **TC-STP-06** | Goods Receipt Updates Stock Exactly Once | PO in `ORDERED` status for 150 KG | `POST /api/purchase/orders/:id/receive` | Stock increases by 150 KG (50 -> 200 KG); PO status -> `RECEIVED` | Stock increased transactionally by 150 KG; `InventoryTransaction` recorded | **PASS** | `test-phase3-phase4.js` Test 4.6: HTTP 200 OK. | None. Verified. |
| **TC-STP-07** | Duplicate Goods Receipt Rejection & Concurrency Protection | PO already marked `RECEIVED` | Repeat goods receipt attempt | Rejected with 409 Conflict; stock not increased again | Rejected with 409 Conflict; stock remained 200 KG (no double increase) | **PASS** | `test-phase3-phase4.js` Test 4.7: Stock remained 200 KG. | None. Row lock & transaction guard verified. |
| **TC-STP-08** | Shortage Auto-Resolution Post Receipt | Stock increased to 200 KG after receipt | `GET /api/manufacturing/materials/shortages` | Material no longer appears as shortage | Material deficit resolved; warehouse stock covers requirements | **PASS** | `test-phase3-phase4.js` Test 4.8: Shortage cleared. | None. Verified. |
| **TC-STP-09** | Shortage Dashboard & Reorder Modal UI | Production orders tab in Factory Ops | Click "Raw Material Shortages & Reorders" tab; click "Create PO" | Displays shortage dashboard, deficit pills, supplier dropdown, notes & confirmation | Modal opens with prefilled deficit, validates input, shows confirmation dialog | **PASS** | ProductionView.jsx build & manual test verified. | None. Verified. |

