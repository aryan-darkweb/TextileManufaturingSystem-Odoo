# TextileFlow — Module & Component Test Matrix

This test matrix contains the detailed execution and verification results for every module, API route, form, and workflow tested during the audit against the live application and shared Supabase database.

---

## 1. System Health & Infrastructure

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-SYS-01** | Backend Health & Supabase DB Connectivity | Express on port 5000, Supabase configured in `.env` | `GET /api/health` | Returns HTTP 200, status `healthy`, database `connected: true`. | HTTP 200, `database.connected: true`, database provider `Supabase PostgreSQL`. | **PASS** | `GET /api/health` -> HTTP 200, response time 42ms. | None. Verified. |
| **TC-SYS-02** | Frontend Vite Production Build | Node.js, Vite build runner | `npm run build` in `frontend` | Production assets bundled without syntax errors or broken imports. | Bundled in 2.31s without errors or warnings (`dist/` generated). | **PASS** | Vite output: 1921 modules transformed, 0 errors. | None. Clean compilation. |
| **TC-SYS-03** | Monolithic Single-Server Architecture | Project files in `backend/` and `frontend/` | Inspect network tab and API client | All requests route to single port 5000 or Vite proxy `/api`. | All 10 modules routed through monolithic Express server on port 5000. | **PASS** | [index.js](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/backend/src/routes/index.js) mounts all modules on single Express router. | None. Verified. |

---

## 2. Raw Material Inventory & Procurement

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-INV-01** | Stock Integrity — Arbitrary Overwrite Disallowed | Product `PROD-TEST-747526` with currentStock = 200.0 | `PUT /api/inventory/products/:id` with `{ currentStock: 9999.0 }` | Metadata updates, but stock quantity is not overwritten. | Metadata updated; `currentStock` remains exactly 200.0 in DB. | **PASS** | DB query: `refreshedProduct.currentStock === 200.0`. | None. Rule enforced in [inventory.service.js](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/backend/src/services/inventory.service.js). |
| **TC-INV-02** | Manual Product Creation Stripped from UI | Open Inventory view in frontend | Inspect UI for "Add Product" button or creation modal | No manual product/stock creation modal present in UI. | Button and modal removed; info banner explains stock intake via PO. | **PASS** | [InventoryView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/InventoryView.jsx) contains no manual creation button. | None. Verified. |
| **TC-INV-03** | Low Stock Alerts | Product with `currentStock <= minimumStock` | `GET /api/inventory/low-stock` | Returns list of products below minimum stock. | Returns active items with stock <= minimum threshold. | **PASS** | HTTP 200, returns array of low stock products. | None. Verified. |
| **TC-PUR-01** | Purchase Order Creation Leaves Stock Untouched | Raw material Yarn `YRN-01` with stock = 100 kg | Create PO for 200 kg via `POST /api/purchase/orders` | PO created with status `ORDERED`; stock remains 100 kg. | PO created; product `currentStock` remains exactly 100 kg. | **PASS** | DB verified: stock unchanged upon PO creation. | None. Rule verified. |
| **TC-PUR-02** | Goods Receipt Increases Stock Exactly Once | PO `PO-2026-0001` with 50 kg ordered | `POST /api/purchase/orders/:id/receive` with 50 kg | Stock increments by 50 kg; `InventoryTransaction` logged. | Stock increased by 50 kg; PO status became `RECEIVED`. | **PASS** | `InventoryTransaction` logged with `type: PURCHASE_RECEIPT`. | None. Verified. |
| **TC-PUR-03** | Over-receiving Rejection | PO line item with 50 kg ordered, 50 kg already received | Attempt to receive another 10 kg | Request rejected with 400 Bad Request. | Error returned: "Cannot receive 10. Outstanding quantity is 0". | **PASS** | HTTP 400 error returned by `receiveGoods`. | None. Over-receiving protected. |

---

## 3. Buyer Sales Orders & Delivery Visibility

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-SO-01** | Buyer Phone Number — Reject < 10 Digits | Customer payload with phone `987654321` (9 digits) | `POST /api/sales/customers` | Rejected with 400 Bad Request. | Rejected with 400: "Phone number must contain exactly 10 numeric digits". | **PASS** | `test-business-rules.js` Test 1: HTTP 400. | None. Verified. |
| **TC-SO-02** | Buyer Phone Number — Reject > 10 Digits | Customer payload with phone `98765432101` (11 digits) | `POST /api/sales/customers` | Rejected with 400 Bad Request. | Rejected with 400: "Phone number must contain exactly 10 numeric digits". | **PASS** | `test-business-rules.js` Test 1: HTTP 400. | None. Verified. |
| **TC-SO-03** | Buyer Phone Number — Reject Non-digits | Customer payload with phone `98765ABCD0` | `POST /api/sales/customers` | Rejected with 400 Bad Request. | Rejected with 400: "Phone number must contain exactly 10 numeric digits". | **PASS** | `test-business-rules.js` Test 1: HTTP 400. | None. Verified. |
| **TC-SO-04** | Buyer Phone Number — Accept Exactly 10 Digits | Customer payload with phone `9876543210` | `POST /api/sales/customers` | Accepted with 201 Created. | Accepted with 201; customer created with valid phone. | **PASS** | `test-business-rules.js` Test 1: HTTP 201. | None. Verified. |
| **TC-SO-05** | Delivery Deadline — Reject Yesterday / Past Date | Order payload with deadline = yesterday's date | `POST /api/sales/orders` | Rejected with 400 Bad Request. | Rejected with 400: "Delivery deadline cannot be in the past". | **PASS** | `test-business-rules.js` Test 2: HTTP 400. | None. Verified. |
| **TC-SO-06** | Delivery Deadline — Accept Future Date | Order payload with deadline = 10 days in future | `POST /api/sales/orders` | Accepted with 201 Created. | Accepted with 201; order generated with `orderNumber`. | **PASS** | `test-business-rules.js` Test 2: HTTP 201. | None. Verified. |
| **TC-SO-07** | Delivery Deadline — Frontend Date Picker min=Today | Open Sales Order creation modal in browser | Inspect date picker input element | Date picker has `min={todayLocal}` preventing selection of past dates. | HTML input attribute `min="2026-10-10"` actively enforced. | **PASS** | [SalesOrdersView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/SalesOrdersView.jsx) line 116. | None. Verified. |
| **TC-SO-08** | Real-time Floor Stage Tracking in Sales Orders | Sales Order linked to active production order | View sales order cards in [SalesOrdersView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/SalesOrdersView.jsx) | Displays live production stage (Weaving, Dyeing, etc.) and progress % | Only displays static status badge and manual status dropdown. | **PARTIAL** | Backend has `getStatusBySalesOrder`, but frontend UI does not invoke it. | DEF-SO-01: Embed live floor stage indicator from backend API into order cards. |

---

## 4. Manufacturing & Machine Monitoring

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-MFG-01** | Material Requirement vs Available Stock Check | Production order requiring 100 kg yarn; only 10 kg in stock | `GET /api/manufacturing/materials/requirement-vs-available/:id` | Flags shortage as `SHORT` with shortage quantity = 90 kg. | Returns `shortage: 90`, `status: "SHORT"`. | **PASS** | `smoke-factory.js` Step 3: HTTP 200, status `SHORT`. | None. Verified. |
| **TC-MFG-02** | Sequential Stage Progression | Production order in `SPINNING` | Start stage -> Complete stage | Raw yarn deducted atomically; order advances to `WEAVING`. | Raw yarn deducted (100 kg); order stage updated to `WEAVING`. | **PASS** | `smoke-factory.js` Step 4: stage log closed. | None. Verified. |
| **TC-MFG-03** | Machine Locking During Stage Execution | Machine `SPN-01` assigned to active stage | Check machine status after stage start | Machine status transitions from `IDLE` to `RUNNING`. | Machine status updated to `RUNNING` in database. | **PASS** | DB query: `machine.status === 'RUNNING'`. | None. Verified. |
| **TC-MFG-04** | Repeat Stage Complete Idempotency Guard | Stage log already marked `COMPLETED` | Attempt to call complete stage again | Rejected with 409 Conflict. | Rejected with 409: "No in-progress stage log found for stage". | **PASS** | `smoke-factory.js` Step 4: HTTP 409. | None. Prevents double raw material deduction. |
| **TC-MFG-05** | Final Stage Output Increments Finished Goods | Complete `FINISHING` stage with 180 meters output | `POST /orders/:id/stages/complete` for FINISHING | Finished goods inventory stock incremented by 180 meters. | Finished product stock increased by 180; order marked `COMPLETED`. | **PASS** | `smoke-factory.js` Step 4: finished goods +180 meters. | None. Verified. |
| **TC-MFG-06** | Machine Breakdown Status Toggle | Machine `WEV-01` in `IDLE` | `PATCH /api/manufacturing/machines/:id/status` with `BREAKDOWN` | Machine status updated to `BREAKDOWN`. | Status updated successfully; reflected in Factory Today view. | **PASS** | HTTP 200, machine status updated. | None. Verified. |
| **TC-MFG-07** | Machine-Level Daily Production Aggregation | Multiple stage completions across machines on current date | Query daily production output per machine | API returns total meters produced today per machine. | No endpoint or view exists aggregating daily output by machine. | **PARTIAL** | Stage logs have `outputQuantity`, but aggregate endpoint is missing. | DEF-MFG-01: Implement `/api/manufacturing/machines/daily-output`. |

---

## 5. Quality Control & Roll Traceability

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-QC-01** | Log Roll Inspection with Defect Tagging | Production order completed with 180 meters | `POST /api/quality/inspections` with roll number, meters, defect type `HOLES` | Inspection saved with status `REJECTED`, defect record linked. | Saved in `quality_inspections` and `defect_records`. | **PASS** | `smoke-factory.js` Step 5: HTTP 201. | None. Verified. |
| **TC-QC-02** | Roll Lineage & Genealogy Trace | Inspected roll linked to production order | `GET /api/manufacturing/orders/:id/trace` | Returns originating machine, operator, raw material batches, and inspections. | Returns complete trace tree for order and rolls. | **PASS** | HTTP 200, trace returned. | None. Verified. |
| **TC-QC-03** | Re-inspection of Rework Roll | Roll with status `REWORK` | `PATCH /api/quality/inspections/:id` with status `PASSED` | Roll status updated to `PASSED`; dispatch-ready count increases. | Roll status updated; dispatch-ready count incremented. | **PASS** | [QualityView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/factory/QualityView.jsx) modal. | None. Verified. |
| **TC-QC-04** | Dispatch Gate — Block Dispatches Exceeding Passed Rolls | 4 rolls inspected (2 PASSED, 1 REWORK, 1 REJECTED); requested = 5 | `POST /api/dispatch` with 5 rolls | Rejected with 409 Conflict. | Rejected with 409: "Cannot dispatch 5 rolls. Only 2 passed rolls are dispatch-ready". | **PASS** | `smoke-factory.js` Step 7: HTTP 409. | None. Quality guard enforced. |

---

## 6. Dispatch & Logistics

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-DSP-01** | Eligible Orders List | Unfulfilled sales order with warehouse stock available | `GET /api/dispatch/eligible-orders` | Returns sales order with buyer name and outstanding quantity. | Returns eligible sales order; displayed in frontend dropdown. | **PASS** | `test-business-rules.js` Test 4a: HTTP 200. | None. Verified. |
| **TC-DSP-02** | Dispatch Confirmation & Stock Deduction | Sales order for 120 meters; warehouse stock = 200 meters | `POST /api/dispatch` with vehicle, destination, 2 rolls | Dispatch created (DSP-2026-XXXX); stock decremented by 120 to 80. | Dispatch status `DISPATCHED`; stock deducted exactly once to 80.0. | **PASS** | `test-business-rules.js` Test 4b/4c: stock = 80.0. | None. Verified. |
| **TC-DSP-03** | Inventory Movement Logging | Dispatch confirmed | Query `inventory_transactions` | Logs transaction of type `DISPATCH` with quantity -120.0. | Transaction record logged with reference number and vehicle ID. | **PASS** | `test-business-rules.js` Test 4e: txLog.quantity === -120.0. | None. Verified. |
| **TC-DSP-04** | Sales Order Fulfillment Status Transition | Dispatch confirmed | Query sales order status in database | Status updated to `DISPATCHED`. | `sales_orders.status` updated to `DISPATCHED`. | **PASS** | `test-business-rules.js` Test 4d: status === 'DISPATCHED'. | None. Verified. |
| **TC-DSP-05** | Duplicate Dispatch Rejection & Double Deduction Guard | Sales order already dispatched | Attempt second dispatch with same `salesOrderId` | Rejected with 409 Conflict; stock not deducted again. | Rejected with 409: "Duplicate dispatch prohibited"; stock remains 80.0. | **PASS** | `test-business-rules.js` Test 4f: HTTP 409, stock = 80.0. | None. Verified. |
| **TC-DSP-06** | Insufficient Stock Rejection | Sales order for 150 meters; warehouse stock = 80 meters | `POST /api/dispatch` | Rejected with 409 Conflict. | Rejected with 409: "Insufficient stock. Required: 150, Available: 80". | **PASS** | `test-business-rules.js` Test 4g: HTTP 409. | None. Verified. |

---

## 7. HR, Attendance & Shifts

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-HR-01** | Bulk Attendance Register | Active workers with wage rates | `POST /api/hr/attendance/bulk` for Morning shift | Records attendances in single transaction; computes wages. | PRESENT worker gets 100% wage; HALF_DAY worker gets 50% wage. | **PASS** | `smoke-factory.js` Step 8: HTTP 201. | None. Verified. |
| **TC-HR-02** | Monthly Payroll Summary | Recorded attendances for current month | `GET /api/hr/attendance/summary?month=YYYY-MM` | Returns total shifts worked and gross wages payable per worker. | Aggregated wages returned accurately for monthly payroll. | **PASS** | `smoke-factory.js` Step 8: HTTP 200. | None. Verified. |

---

## 8. Costing, Accounting & Owner Closing the Books

| Test ID | Feature / Component | Preconditions & Test Data | Steps Performed | Expected Result | Actual Result | Status | Evidence | Defect Reference & Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| **TC-ACC-01** | Order Production Cost Calculation | Sales order with raw material consumption and operator wages | Query order manufacturing cost | Computes actual cost (Raw Material Cost + Operator Shift Wages + Machine Cost). | No endpoint or service method exists for order costing. | **MISSING** | Code search: `cost` only exists in `unitCost`. | DEF-ACC-01: Create order costing service and API. |
| **TC-ACC-02** | Owner Month-End Profit & Loss Summary | Dispatched sales orders, raw material PO bills, worker wages | View owner month-end closing dashboard | Shows Total Billed Revenue, Total Material Expenses, Total Payroll, and Net Profit/Loss. | No financial ledger or P&L report exists in backend or frontend. | **MISSING** | `DashboardView.jsx` only shows operational counts. | DEF-ACC-02: Create financial accounting service and Owner P&L View. |
| **TC-ACC-03** | Buyer Invoices & Payments Received | Dispatched sales order with total amount | Track buyer invoice and payment status | Records invoice generated, payment received, and outstanding balance. | No payment tracking model or payment recording API exists. | **MISSING** | Schema check: no `Invoice` or `Payment` model. | DEF-ACC-03: Implement buyer invoice and payment tracking. |
