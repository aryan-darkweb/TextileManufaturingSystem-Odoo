# Factory Operations API Documentation (TextileFlow)

**Module:** Factory Operations (Manufacturing Execution, Quality Assurance, HR & Shift Attendance)  
**Branch:** `feature/factory-operations`  
**Base URL:** `http://localhost:5000/api`  
**Response Envelope:** All responses follow the TextileFlow standard JSON envelope:
```json
{
  "success": true,
  "message": "Human readable status message",
  "data": { ... },
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

---

## 1. Manufacturing Endpoints (`/api/manufacturing`)

### 1.1 `POST /api/manufacturing/orders`
Creates a new Production Order and records planned material consumption rows in one transaction.
* **Status Code:** `201 Created`
* **Request Body:**
```json
{
  "salesOrderId": "clxxxx...",
  "productId": "clyyyy...",
  "targetQuantity": 1000.0,
  "machineId": "clzzzz...",
  "startDate": "2026-10-10T08:00:00.000Z",
  "notes": "Batch A denim weave",
  "materials": [
    {
      "rawMaterialId": "claaaa...",
      "stage": "SPINNING",
      "plannedQuantity": 520.0,
      "unit": "KG"
    }
  ]
}
```
* **Validation & Rules:**
  - `salesOrderId`, `productId`, `targetQuantity` are required.
  - `targetQuantity` must be > 0.
  - Generates `orderNumber` in the format `PO-YYYY-NNNN` (e.g. `PO-2026-0001`).
  - Initializes order in `stage: "SPINNING"` and `status: "PLANNED"`.
* **Error Codes:**
  - `400 Bad Request`: Validation error or invalid ID.
  - `404 Not Found`: Sales order or product does not exist.

---

### 1.2 `GET /api/manufacturing/orders`
Lists production orders with filters and progress percentage.
* **Query Params:**
  - `status`: `PLANNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`
  - `stage`: `SPINNING`, `WEAVING`, `DYEING`, `FINISHING`, `COMPLETED`
  - `salesOrderId`: UUID string
  - `search`: Search by order number or product name/code
* **Response `data`:**
```json
[
  {
    "id": "cm123...",
    "orderNumber": "PO-2026-0001",
    "stage": "SPINNING",
    "status": "PLANNED",
    "targetQuantity": 1000.0,
    "producedQuantity": 0.0,
    "progressPct": 0.0,
    "product": { "id": "...", "code": "FAB-DNM-01", "name": "Indigo Denim", "unit": "METER" },
    "salesOrder": { "id": "...", "orderNumber": "SO-2026-0001" },
    "machine": null,
    "createdAt": "..."
  }
]
```

---

### 1.3 `GET /api/manufacturing/orders/:id`
Returns full order detail: ordered stage logs, planned and actual material consumptions, roll inspections, defect records, defect rate, and dispatch-ready roll count.
* **Response `data`:**
```json
{
  "id": "cm123...",
  "orderNumber": "PO-2026-0001",
  "stage": "WEAVING",
  "status": "IN_PROGRESS",
  "targetQuantity": 1000.0,
  "producedQuantity": 480.0,
  "progressPct": 48.0,
  "defectRate": { "inspectedMeters": 480.0, "defectiveMeters": 20.0, "ratePct": 4.17, "badge": "AMBER" },
  "dispatchReady": { "passedRolls": 4, "reworkRolls": 1, "rejectedRolls": 0 },
  "stageLogs": [...],
  "materialConsumptions": [...],
  "inspections": [...]
}
```

---

### 1.4 `GET /api/manufacturing/orders/:id/trace`
Returns complete upstream and downstream batch traceability:
* Linked Sales Order and buyer customer information
* Raw materials consumed with transaction IDs
* Step-by-step stage log history with machines, operators, inputs, outputs, and scrap
* Quality inspections and granular defect logs

---

### 1.5 `POST /api/manufacturing/orders/:id/stages/start`
Starts execution for the order's current stage.
* **Request Body:** `{ "machineId": "optional-id", "operatorId": "optional-id", "notes": "optional" }`
* **Rules & Guards:**
  - Allowed only for the order's current active stage.
  - Previous stage log must be `COMPLETED` (unless first stage `SPINNING`).
  - Stage `inputQuantity` is set to previous stage's `outputQuantity` (or order's `targetQuantity` for `SPINNING`).
  - Sets `ProductionOrder.status = "IN_PROGRESS"`.
  - Transitions `Machine.status = "RUNNING"` (validating machine type matches stage).
  - Updates `SalesOrder.status = "IN_PRODUCTION"` if currently `CONFIRMED` or `PENDING`.
* **Error Codes:**
  - `409 Conflict`: Current stage already has a log in progress or previous stage is incomplete.
  - `400 Bad Request`: Machine type does not match current production stage.

---

### 1.6 `POST /api/manufacturing/orders/:id/stages/complete`
Completes active stage execution in a single atomic database transaction.
* **Request Body:**
```json
{
  "outputQuantity": 480.0,
  "wasteQuantity": 20.0,
  "actuals": [
    { "rawMaterialId": "prod_yrn_01", "actualQuantity": 500.0 }
  ],
  "notes": "Spun onto 20 cones"
}
```
* **Rules & Guards:**
  - Closes active `ProductionStageLog` (`completedAt`, `outputQuantity`, `wasteQuantity`).
  - Validates `outputQuantity <= inputQuantity`.
  - For each `MaterialConsumption` of this stage where `isDeducted == false`:
    - Deducts stock via `PRODUCTION_CONSUMPTION` using stock transaction guard.
    - Updates `isDeducted = true` and saves `inventoryTransactionId` (idempotency guard: never deducts twice).
  - Resets assigned machine to `IDLE`.
  - Advances order to next stage (`SPINNING -> WEAVING -> DYEING -> FINISHING -> COMPLETED`).
  - Sets `producedQuantity = outputQuantity`.
  - **On FINISHING completion:**
    - Order transitions to `status = "COMPLETED"`, `stage = "COMPLETED"`, `endDate = now()`.
    - Automatically adds an `InventoryTransaction` of type `PRODUCTION_OUTPUT` incrementing `Product.currentStock` of the finished product.
* **Error Codes:**
  - `400 Bad Request`: Output quantity exceeds input quantity.
  - `409 Conflict`: No active stage in progress or insufficient raw material stock.

---

### 1.7 `PATCH /api/manufacturing/orders/:id/status`
Pauses or resumes an order.
* **Request Body:** `{ "status": "PAUSED" }` or `{ "status": "IN_PROGRESS" }`

---

### 1.8 `GET /api/manufacturing/status/by-sales-order/:salesOrderId`
Integration endpoint for Sales & Supply Chain dashboard.
* **Response `data`:**
```json
{
  "salesOrderId": "so_123...",
  "productionOrders": [
    {
      "orderNumber": "PO-2026-0001",
      "stage": "WEAVING",
      "status": "IN_PROGRESS",
      "targetQuantity": 1000.0,
      "producedQuantity": 480.0,
      "progressPct": 48.0
    }
  ],
  "overallStage": "WEAVING",
  "overallProgressPct": 48.0,
  "estimatedNote": "Order in WEAVING (48.0% produced)"
}
```

---

### 1.9 `GET /api/manufacturing/materials/requirement-vs-available/:productionOrderId`
Compares planned raw material quantities against current warehouse stock.
* **Response `data`:**
```json
{
  "productionOrderId": "po_123...",
  "materials": [
    {
      "rawMaterialId": "prod_01...",
      "code": "YRN-COT-30",
      "name": "Cotton Yarn 30s",
      "unit": "KG",
      "stage": "SPINNING",
      "plannedQuantity": 500.0,
      "actualQuantity": 0.0,
      "availableStock": 120.0,
      "shortageQuantity": 380.0,
      "status": "SHORT"
    }
  ]
}
```

---

### 1.10 `GET /api/manufacturing/machines` & `PATCH /api/manufacturing/machines/:id/status`
* `GET /api/manufacturing/machines`: Lists all machines with current active production order.
* `PATCH /api/manufacturing/machines/:id/status`: Updates machine status (`IDLE`, `RUNNING`, `MAINTENANCE`, `BREAKDOWN`).

---

### 1.11 `GET /api/manufacturing/factory-today`
Executive snapshot of operations today.
* **Response `data`:**
```json
{
  "ordersPerStage": { "SPINNING": 1, "WEAVING": 2, "DYEING": 0, "FINISHING": 1, "COMPLETED": 3 },
  "qualityAlertOrders": 1,
  "machines": { "total": 10, "running": 3, "idle": 6, "breakdown": 1 },
  "attendanceToday": { "present": 24, "halfDay": 2, "absent": 2, "leave": 1 },
  "lowStockMaterialsCount": 3,
  "overdueSalesOrdersCount": 1
}
```

---

## 2. Quality Control Endpoints (`/api/quality`)

### 2.1 `POST /api/quality/inspections`
Records a fabric roll inspection with defect breakdowns.
* **Status Code:** `201 Created`
* **Request Body:**
```json
{
  "productionOrderId": "po_123...",
  "rollNumber": "ROLL-2026-0001",
  "metersInspected": 120.0,
  "status": "PASSED",
  "inspectorName": "Sunil Verma",
  "notes": "First roll inspected off loom",
  "defects": []
}
```
* **Validation & Rules:**
  - `rollNumber` must be unique across the system.
  - Linked `ProductionOrder` must not be `PLANNED` (must have begun production).
  - Status `PASSED` requires 0 defects of severity `MAJOR` or `CRITICAL`.
  - Status `REWORK` or `REJECTED` requires at least one defect row.
  - Auto-assigns inspection `defectType` to the most severe defect recorded (or `NONE`).
  - If all production orders linked to the sales order are `COMPLETED` and at least one roll is `PASSED`, sets `SalesOrder.status = "READY_TO_SHIP"`.
* **Error Codes:**
  - `400 Bad Request`: Roll number collision or missing required defect list on REWORK/REJECTED.
  - `409 Conflict`: Cannot inspect a PLANNED order or MAJOR defect present on PASSED status.

---

### 2.2 `PATCH /api/quality/inspections/:id`
Re-inspects a roll currently under `REWORK`.
* **Request Body:** `{ "status": "PASSED", "notes": "Re-washed and color leveled" }`
* **Rules & Guards:**
  - Only allows transition from `REWORK` to `PASSED` or `REJECTED`.
  - Appends timestamped note line to existing inspection notes.
  - Inspections with status `PASSED` or `REJECTED` are final and cannot be modified.
* **Error Codes:**
  - `409 Conflict`: Cannot re-inspect already finalized (PASSED/REJECTED) rolls.

---

### 2.3 `GET /api/quality/inspections`
Filter inspections by `productionOrderId`, `status`, and date range (`dateFrom`, `dateTo`).

---

### 2.4 `GET /api/quality/dispatch-ready/by-sales-order/:salesOrderId`
**The Contract Endpoint for Dispatch and Logistics.**
* **Formula:**
  `dispatchReadyRolls = max(0, totalPassedRolls - totalReservedOrDispatchedRolls)`
  where `totalReservedOrDispatchedRolls` is the sum of `dispatchedRollCount` across all `DispatchRecord` rows (including `PREPARING`, `DISPATCHED`, `DELIVERED`).
* **Response `data`:**
```json
{
  "salesOrderId": "so_123...",
  "passedRolls": 10,
  "reservedOrDispatchedRolls": 4,
  "dispatchReadyRolls": 6,
  "blockedRolls": 2,
  "uninspectedNote": "6 rolls ready for immediate dispatch",
  "orders": [...]
}
```

---

### 2.5 `GET /api/quality/defect-rate/:productionOrderId`
Calculates defect percentage and badge color:
* `GREEN`: Defect rate < 2.0%
* `AMBER`: Defect rate 2.0% - 5.0%
* `RED`: Defect rate > 5.0%
Supports `?productId=` query to calculate historical defect rate across all runs of a fabric.

---

## 3. How Dispatch Uses Us (Integration Contract)

Quality module exports the assertion function:
```javascript
const { assertDispatchable } = require('../services/quality.service');
```

Before creating any dispatch record, Kishan's dispatch service calls:
```javascript
// backend/src/services/dispatch.service.js
if (data.salesOrderId && data.dispatchedRollCount) {
  await assertDispatchable(data.salesOrderId, data.dispatchedRollCount);
}
```

### Behavioral Contract:
1. If the sales order has 0 production orders or 0 passed rolls, `assertDispatchable` throws a `409 Conflict` error: `"Cannot dispatch: Sales order has 0 passed rolls inspected"`.
2. If the user attempts to dispatch more rolls than are currently ready (`requestedRolls > dispatchReadyRolls`), it throws a `409 Conflict` error: `"Cannot dispatch 10 rolls: only 6 rolls are inspected and dispatch-ready (4 rolls already reserved/dispatched)"`.
3. Only when `requestedRolls <= dispatchReadyRolls` does the dispatch creation proceed.

---

## 4. HR & Shift Attendance Endpoints (`/api/hr`)

### 4.1 Employees
* `GET /api/hr/employees`: Filter by `department`, `status`, and `search`.
* `POST /api/hr/employees`: Create employee with unique `employeeCode` and `wagePerShift >= 0`.
* `GET /api/hr/employees/:id`: Retrieve single employee.
* `PATCH /api/hr/employees/:id`: Update employee details. Soft delete is achieved by setting `status: "TERMINATED"`.

---

### 4.2 `POST /api/hr/attendance/bulk`
Submits daily shift attendance for multiple employees in one atomic transaction.
* **Status Code:** `201 Created`
* **Request Body:**
```json
{
  "date": "2026-10-10",
  "shift": "MORNING",
  "records": [
    { "employeeId": "emp_01...", "status": "PRESENT" },
    { "employeeId": "emp_02...", "status": "HALF_DAY" },
    { "employeeId": "emp_03...", "status": "LEAVE" },
    { "employeeId": "emp_04...", "status": "ABSENT" }
  ]
}
```
* **Validation & Rules:**
  - Date cannot be in the future.
  - Upserts uniquely on `@@unique([employeeId, date, shift])`.
  - Wage auto-calculation:
    - `PRESENT`: `wageCalculated = wagePerShift`
    - `HALF_DAY`: `wageCalculated = wagePerShift * 0.5`
    - `ABSENT` / `LEAVE`: `wageCalculated = 0.0`
  - Marking `LEAVE` does not alter employee master status.

---

### 4.3 `GET /api/hr/attendance` & `GET /api/hr/attendance/summary`
* `GET /api/hr/attendance?date=YYYY-MM-DD&shift=MORNING&department=WEAVING`: Retrieves attendance list with employee details.
* `GET /api/hr/attendance/summary?month=YYYY-MM`: Monthly muster roll summary showing per-employee counts for `present`, `halfDay`, `absent`, `leave`, total wages earned, plus department and overall totals.
