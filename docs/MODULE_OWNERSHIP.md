# TextileFlow Module Ownership & Team Responsibilities

## 1. Division of Responsibilities

```
+--------------------------------------------------------------------------+
|                       EVEREST TEXTILE MILLS PLATFORM                      |
+------------------------------------+-------------------------------------+
|        KISHAN                      |             TEAMMATE                |
| (Supply Chain & Integration Head)  |      (Factory Operations Lead)      |
+------------------------------------+-------------------------------------+
| • Shared Architecture & DB Setup   | • Manufacturing Execution (Machines)|
| • Inventory & Stock Alerts (Yarn)  | • Floor Production Orders           |
| • Purchase Management (Suppliers)  | • Quality Control & Defect Checks   |
| • Sales Orders & Buyer Workflows   | • HR & Shift Worker Attendance      |
| • Dispatch & Logistics (Trucks)    | • Floor Shift Wage Calculations     |
| • Integration Contracts & API Spec |                                     |
+------------------------------------+-------------------------------------+
|                           JOINT WORK                                     |
| • Unified Executive Dashboard (Costing, Revenue & Mill Profitability)    |
| • Order-to-Production End-to-End Workflow & Data Consistency             |
| • Shared Supabase PostgreSQL Coordination & Production Testing           |
+--------------------------------------------------------------------------+
```

---

## 2. Code File Mapping

### Kishan (Supply Chain & Integration Lead)
| Domain | Route File | Controller File | Service File | Prisma Models |
| :--- | :--- | :--- | :--- | :--- |
| **Setup & Health** | `routes/health.routes.js` | `controllers/health.controller.js` | `config/prisma.js` | System Health |
| **Inventory** | `routes/inventory.routes.js` | `controllers/inventory.controller.js` | `services/inventory.service.js` | `Product`, `InventoryTransaction` |
| **Sales** | `routes/sales.routes.js` | `controllers/sales.controller.js` | `services/sales.service.js` | `Customer`, `SalesOrder`, `SalesOrderItem` |
| **Purchase** | `routes/purchase.routes.js` | `controllers/purchase.controller.js` | `services/purchase.service.js` | `Supplier`, `PurchaseOrder`, `PurchaseOrderItem` |
| **Dispatch** | `routes/dispatch.routes.js` | `controllers/dispatch.controller.js` | `services/dispatch.service.js` | `DispatchRecord` |

### Teammate (Factory Operations Lead)
| Domain | Route File | Controller File | Service File | Prisma Models |
| :--- | :--- | :--- | :--- | :--- |
| **Manufacturing** | `routes/manufacturing.routes.js` | `controllers/manufacturing.controller.js` | `services/manufacturing.service.js` | `Machine`, `ProductionOrder` |
| **Quality Control** | `routes/quality.routes.js` | `controllers/quality.controller.js` | `services/quality.service.js` | `QualityInspection` |
| **HR & Attendance** | `routes/hr.routes.js` | `controllers/hr.controller.js` | `services/hr.service.js` | `Employee`, `Attendance` |

### Joint Work
| Domain | Route File | Controller File | Service File | Prisma Models |
| :--- | :--- | :--- | :--- | :--- |
| **Executive Dashboard** | `routes/dashboard.routes.js` | `controllers/dashboard.controller.js` | `services/dashboard.service.js` | All Models (Aggregations) |

---

## 3. Shared Database Coordination Protocol

1. **Single Database Rule:**
   - Both developers connect their local Express backend to the **same shared Supabase instance**.
   - Records created by Kishan (e.g. Sales Order `SO-2026-0001`) are immediately visible to Teammate's production planning.
2. **Schema Modification Protocol:**
   - Neither developer modifies `schema.prisma` without prior coordination.
   - Kishan oversees core relational integrity.
   - Teammate requests or coordinates fields needed on `Machine`, `ProductionOrder`, `QualityInspection`, and `Attendance`.
3. **Migration Rules:**
   - Always run `npx prisma migrate dev --name descriptive_name` using `DIRECT_URL`.
   - Never use `prisma db push` on the shared database.
   - Never run `prisma migrate reset` on the shared database.
   - Always commit the migration folder (`backend/prisma/migrations/`) to Git.
