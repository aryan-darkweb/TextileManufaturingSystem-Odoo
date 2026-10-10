# TextileFlow Data Model Specification

## 1. Overview

The TextileFlow data model supports **Everest Textile Mills**' end-to-end workflow: yarn intake at the gate, spinning, weaving, dyeing, quality roll inspection, finished goods warehousing, sales orders, dispatch, and worker wages.

All models reside in a single schema file (`backend/prisma/schema.prisma`) connected to Supabase PostgreSQL.

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    SUPPLIER ||--o{ PURCHASE_ORDER : "supplies"
    PURCHASE_ORDER ||--|{ PURCHASE_ORDER_ITEM : "contains"
    PRODUCT ||--o{ PURCHASE_ORDER_ITEM : "ordered_in"
    PRODUCT ||--o{ INVENTORY_TRANSACTION : "logged_in"
    CUSTOMER ||--o{ SALES_ORDER : "places"
    SALES_ORDER ||--|{ SALES_ORDER_ITEM : "contains"
    PRODUCT ||--o{ SALES_ORDER_ITEM : "sold_as"
    SALES_ORDER ||--o{ PRODUCTION_ORDER : "initiates"
    SALES_ORDER ||--o{ DISPATCH_RECORD : "fulfilled_by"
    PRODUCT ||--o{ PRODUCTION_ORDER : "manufactures"
    MACHINE ||--o{ PRODUCTION_ORDER : "executes_on"
    PRODUCTION_ORDER ||--o{ QUALITY_INSPECTION : "produces_rolls"
    EMPLOYEE ||--o{ ATTENDANCE : "logs"

    PRODUCT {
        string id PK
        string code UK "SKU Code"
        string name
        enum type "RAW_MATERIAL | FINISHED_GOODS | WIP | CONSUMABLE"
        string category
        enum unit "KG | METER | ROLL | CONE | PIECE"
        float currentStock
        float minimumStock "Alert threshold"
        float unitCost
        string color
        string specifications
    }

    CUSTOMER {
        string id PK
        string name
        string companyName
        string email
        string phone
        string address
    }

    SALES_ORDER {
        string id PK
        string orderNumber UK "SO-YYYY-XXXX"
        string customerId FK
        datetime orderDate
        datetime deliveryDeadline
        enum status "PENDING | CONFIRMED | IN_PRODUCTION | READY_TO_SHIP | DISPATCHED"
        float totalAmount
        string notes
    }

    SALES_ORDER_ITEM {
        string id PK
        string salesOrderId FK
        string productId FK
        string fabricType
        string color
        float quantity
        float unitPrice
        float totalPrice
    }

    MACHINE {
        string id PK
        string code UK "SPN-01, WEV-01, DYE-01"
        string name
        enum type "SPINNING | WEAVING | DYEING | FINISHING"
        enum status "IDLE | RUNNING | MAINTENANCE | BREAKDOWN"
        float capacityPerShift
    }

    PRODUCTION_ORDER {
        string id PK
        string orderNumber UK "PROD-YYYY-XXXX"
        string salesOrderId FK
        string productId FK
        string machineId FK
        enum stage "SPINNING | WEAVING | DYEING | FINISHING | COMPLETED"
        float targetQuantity
        float producedQuantity
        enum status "PLANNED | IN_PROGRESS | PAUSED | COMPLETED"
    }

    QUALITY_INSPECTION {
        string id PK
        string rollNumber UK "ROLL-YYYY-XXXX"
        string productionOrderId FK
        float metersInspected
        enum defectType "NONE | HOLES | COLOR_MISMATCH | UNEVEN_WEAVING | STAIN"
        enum status "PASSED | REWORK | REJECTED"
        string inspectorName
    }

    EMPLOYEE {
        string id PK
        string employeeCode UK "EMP-XXX"
        string name
        enum department "SPINNING | WEAVING | DYEING | QUALITY | WAREHOUSE"
        string role
        float wagePerShift
    }

    ATTENDANCE {
        string id PK
        string employeeId FK
        datetime date
        enum shift "MORNING | EVENING | NIGHT"
        enum status "PRESENT | ABSENT | HALF_DAY"
        float wageCalculated
    }
```

---

## 3. Detailed Model Definitions & Attributes

### 3.1. Inventory & Catalog (Kishan)
- **`Product` (`products`):**
  - Primary entity for yarn cones, raw cotton, finished fabric rolls, intermediate dye batches, and chemicals.
  - `minimumStock`: Triggers automatic low-stock warnings before factory looms run out of yarn.
  - `currentStock`: Automatically updated via atomic transactions whenever receipts or dispatches occur.
- **`InventoryTransaction` (`inventory_transactions`):**
  - Audit trail of stock movements (`PURCHASE_RECEIPT`, `PRODUCTION_CONSUMPTION`, `PRODUCTION_OUTPUT`, `DISPATCH`, `ADJUSTMENT`).

### 3.2. Sales & Buyer Management (Kishan)
- **`Customer` (`customers`):**
  - Garment factories, fashion labels, and textile export houses placing bulk fabric orders.
- **`SalesOrder` (`sales_orders`):**
  - Master order header recording delivery deadlines, payment status, and order fulfillment states.
- **`SalesOrderItem` (`sales_order_items`):**
  - Line items detailing exact fabric weave (e.g. 12oz Indigo Twill Denim, Pure Cotton Poplin), color shade, ordered meters, and negotiated unit rates.

### 3.3. Procurement & Inward Gate (Kishan)
- **`Supplier` (`suppliers`):**
  - Spinning mills and cotton ginning suppliers delivering raw yarn.
- **`PurchaseOrder` (`purchase_orders`) & `PurchaseOrderItem` (`purchase_order_items`):**
  - Tracks raw material trucks arriving at the mill gate before unloading into stores.

### 3.4. Dispatch & Logistics (Kishan)
- **`DispatchRecord` (`dispatch_records`):**
  - Gate-out pass linking truck vehicle numbers, driver details, inspected fabric roll counts, and delivery invoices.

### 3.5. Factory Operations - Manufacturing (Teammate)
- **`Machine` (`machines`):**
  - Floor assets across spinning frames, air jet weaving looms, and high-temp dyeing jiggers.
  - Status transitions: `IDLE` ↔ `RUNNING` ↔ `MAINTENANCE` ↔ `BREAKDOWN`.
- **`ProductionOrder` (`production_orders`):**
  - Production batch fulfilling a buyer's `SalesOrder` through defined stages (`SPINNING` → `WEAVING` → `DYEING` → `FINISHING`).

### 3.6. Quality Control (Teammate)
- **`QualityInspection` (`quality_inspections`):**
  - Replaces paper slips. Records individual roll inspections, defect categories (`HOLES`, `COLOR_MISMATCH`, `UNEVEN_WEAVING`, `STAIN`), and release decision (`PASSED`, `REWORK`, `REJECTED`).

### 3.7. Human Resources & Shift Attendance (Teammate)
- **`Employee` (`employees`):**
  - Floor operators, weavers, spinners, and QC supervisors with base wage rates per shift.
- **`Attendance` (`attendances`):**
  - Replaces paper muster rolls across 3 shifts (`MORNING`, `EVENING`, `NIGHT`), enforcing composite uniqueness per `[employeeId, date, shift]`.
