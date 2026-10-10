# TextileFlow — Implementation Roadmap

This roadmap categorizes and ranks all identified functional gaps, incomplete features, and missing problem statement requirements into prioritized phases.

---

## Priority Classifications

- **P0 — Critical:** Broken core workflows, data corruption risks, or major blockers. (All resolved and verified).
- **P1 — High:** Required problem statement functionality (Costing, Accounting, Owner Month-End P&L, Buyer live order stage visibility, Central Transactions). (**ALL RESOLVED AND VERIFIED**).
- **P2 — Medium:** Operational workflow enhancements (Machine daily production metrics, PO generation from shortage, Awaiting Inspection queue).
- **P3 — Low:** Polish, reporting exports, and cosmetic adjustments.

---

## 1. P0 — Critical (All Resolved & Verified)

All previously identified critical bugs have been resolved and verified via automated test suites:
- **RESOLVED:** Dispatch gate failure caused by runtime reference errors and misconfigured roll count logic.
- **RESOLVED:** Single-deduction stock enforcement inside atomic database transactions.
- **RESOLVED:** Strict 10-digit buyer phone validation across React and Express.
- **RESOLVED:** Future-only delivery deadline enforcement across React and Express.
- **RESOLVED:** Stripping manual inventory creation and preventing arbitrary stock overwrites in Edit Product.

---

## 2. P1 — High (Core Problem Statement Gaps — ALL RESOLVED & VERIFIED)

### P1-1: Costing, Accounting & Owner Closing the Books
- **Requirement IDs:** `REQ-ACC-01`, `REQ-ACC-04`, `REQ-ACC-05`, `REQ-ACC-06`, `REQ-DSP-04`
- **Source Requirement:** *"At the end of the month, the owner wants to know what it actually cost to make each order, how much every machine produced, and how much was paid out in worker wages. Raw material bills, worker wages, and payments from buyers all need to come together in one place, so the owner can see, clearly and quickly, whether the mill made money this month."*
- **Status:** **COMPLETED & VERIFIED**
- **Delivered Implementation:**
  1. Built `accounting.service.js`, `accounting.controller.js`, `accounting.routes.js` mounted at `/api/accounting` and `/api/transactions`.
  2. Database Models (`Invoice`, `InvoiceItem`, `BuyerPayment`, `SupplierBill`, `SupplierBillItem`, `SupplierPayment`, `PayrollPayment`, `BusinessExpense`) migrated via Prisma migration `20261010193000_accounting_and_transactions`.
  3. Strict accounting separation:
     - **Accrual Basis P&L:** Invoiced Revenue vs Supplier Billed Materials + Earned Worker Wages + Overheads = Net Profit/Loss.
     - **Cash Basis Cash Flow:** Actual Cleared Buyer Inflows vs Supplier Settlements + Wage Disbursements + Direct Overheads = Net Cash Flow.
     - **Working Capital:** Live balance tracking for Accounts Receivable (AR), Accounts Payable (AP), and unpaid payroll liability.
  4. Order-Level Manufacturing Costing calculating raw material consumption unit costs + shift labor allocation + gross margin %.
  5. Built [OwnerFinanceView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/OwnerFinanceView.jsx) and [TransactionsView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/TransactionsView.jsx).
- **Verification Evidence:** `scripts/test-buyer-finance.js` Tests 5 through 13 passed 100%.

### P1-2: Replace Sales Orders with Buyer Management & Real-time Floor Stage Tracking
- **Requirement IDs:** `REQ-SO-01`, `REQ-SO-02`, `REQ-SO-03`, `REQ-SO-04`, `REQ-SO-05`
- **Source Requirement:** *"A buyer wants to know if their fabric is ready and when it will be delivered... The factory should be able to tell a buyer, at any time, exactly where their order stands: whether it is still being woven, being checked, or ready to ship, without anyone having to go and look."*
- **Status:** **COMPLETED & VERIFIED**
- **Delivered Implementation:**
  1. Built [BuyerManagementView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/BuyerManagementView.jsx) replacing the user-facing Sales Orders app card and navigation.
  2. Searchable buyer directory displaying order count, order value, invoiced totals, payments received, and outstanding balances.
  3. Interactive Buyer Profile drawer displaying complete order history and financial breakdown.
  4. Removed arbitrary manual status dropdown. Replaced with `deriveOrderWorkflowStatus` reflecting real persisted floor execution (`ORDER_RECEIVED`, `MATERIAL_CHECKED`, `AWAITING_MATERIALS`, `MANUFACTURING_IN_PROGRESS`, `QUALITY_APPROVED`, `REWORK_REQUIRED`, `QUALITY_REJECTED`, `READY_FOR_DISPATCH`, `DISPATCHED`, `DELIVERED`).
  5. Enforced 10 numeric digits for phone and future-only delivery deadlines in both React and Express.
- **Verification Evidence:** `scripts/test-buyer-finance.js` Tests 1 through 4 passed 100%.

---

## 3. P2 — Medium (Operational Enhancements)

### P2-1: Machine-Level Daily Production Output Aggregation (Phase 3)
- **Requirement IDs:** `REQ-MFG-07`, `REQ-ACC-02`
- **Source Requirement:** *"The factory needs a simple way to see what every machine is doing right now, and how much fabric it has produced today."*
- **Status:** **COMPLETED & VERIFIED**
- **Delivered Implementation:**
  1. Built `GET /api/manufacturing/machines/daily-output` supporting date, date range (`startDate`, `endDate`), `machineId`, and `stage` filters.
  2. Aggregates actual output from persisted `ProductionStageLog` records. Strictly groups by machine and manufacturing stage, preserving natural stage units (KG for spinning, METER for weaving/dyeing/finishing) to prevent erroneous cross-stage double counting.
  3. Returns operational floor status for all machines alongside recorded output, properly returning 0 for machines without completed production logs.
  4. Built [MachineDailyOutputView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/factory/MachineDailyOutputView.jsx) with warm purple aesthetics, date selectors, filter bars, utilization progress meters, and unit-segregated KPI summary cards.
  5. Added quick-access navigation from `FactoryTodayView.jsx` and tab pill in `FactoryOpsView.jsx`.
- **Verification Evidence:** `scripts/test-phase3-phase4.js` Tests 3.1 through 3.5 passed 100%.

### P2-2: Direct PO Requisition from Material Shortage (Phase 4)
- **Requirement IDs:** `REQ-RM-06`
- **Source Requirement:** *"When a new order comes in, it should be easy to see whether there is enough yarn to start it, or whether more needs to be ordered first."*
- **Status:** **COMPLETED & VERIFIED**
- **Delivered Implementation:**
  1. Built `GET /api/manufacturing/materials/shortages` calculating real deficits (`needed - availableStock`) across active production orders with affected order links.
  2. Built `POST /api/purchase/orders/from-shortage` with strict server-side validation of supplier, raw material, positive quantities, and unit pricing.
  3. Integrated duplicate request prevention (60s idempotent deduplication window with idempotency key).
  4. **Strict Inventory Isolation:** Guaranteed that PO creation leaves warehouse inventory completely unchanged (status `ORDERED`). Stock increments solely upon confirmed goods receipt.
  5. Concurrency-safe goods receipt via PostgreSQL row locking (`FOR UPDATE`) preventing race conditions and double stock updates.
  6. Built Shortage Dashboard and Reorder Modal in [ProductionView.jsx](file:///c:/Users/Kishan/Desktop/Odoo/TextileFlow/frontend/src/components/factory/ProductionView.jsx).
- **Verification Evidence:** `scripts/test-phase3-phase4.js` Tests 4.1 through 4.8 passed 100%.

### P2-3: Dedicated "Awaiting Inspection" Roll Queue
- **Requirement IDs:** `REQ-QC-03`
- **Source Requirement:** *"The factory needs a clear record of what passed, what failed, and what is waiting to be checked."*
- **Status:** Documented / Backlog
- **Suggested Implementation:**
  - Query production orders with `producedQuantity > 0` and display outstanding rolls/meters that have not yet had a `QualityInspection` logged.

