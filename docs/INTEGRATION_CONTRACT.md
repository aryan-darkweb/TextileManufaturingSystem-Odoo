# TextileFlow API Integration Contract

## 1. Global API Standards

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`
- **Port:** Monolithic Express on Port `5000`

### Standard Response Envelope
All endpoints return responses in this consistent structure:

#### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Human readable status description",
  "data": { ... },
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

#### Error Response (HTTP 400 / 404 / 409 / 500)
```json
{
  "success": false,
  "message": "Specific error description",
  "details": { ... },
  "timestamp": "2026-10-10T12:00:00.000Z"
}
```

---

## 2. Endpoints Contract

### 2.1. System & Database Health
- **`GET /api/health`**
  - **Description:** Verifies Express server and Supabase PostgreSQL connectivity without disclosing credentials.
  - **Sample Response:**
    ```json
    {
      "success": true,
      "message": "Health check completed",
      "data": {
        "status": "healthy",
        "service": "TextileFlow Monolithic Backend",
        "port": 5000,
        "database": {
          "configured": true,
          "connected": true,
          "provider": "Supabase PostgreSQL"
        },
        "modules": {
          "inventory": "ACTIVE",
          "sales": "ACTIVE",
          "manufacturing": "READY_FOR_INTEGRATION (Factory Operations)",
          "quality": "READY_FOR_INTEGRATION (Factory Operations)",
          "hr": "READY_FOR_INTEGRATION (Factory Operations)"
        }
      }
    }
    ```

---

### 2.2. Inventory Management (Lead: Kishan)
- **`GET /api/inventory/products`**
  - **Query Params:** `?type=RAW_MATERIAL&category=Yarn&lowStock=true`
  - **Response:** Array of product objects with transaction and sales item counts.

- **`POST /api/inventory/products`**
  - **Body:**
    ```json
    {
      "code": "YRN-COT-40",
      "name": "40s Combed Cotton Yarn Cone",
      "type": "RAW_MATERIAL",
      "category": "Yarn",
      "unit": "KG",
      "initialStock": 500,
      "minimumStock": 150,
      "unitCost": 280,
      "color": "Raw Ecru",
      "specifications": "100% Combed Cotton, 40s Ne"
    }
    ```
  - **Transaction Rule:** If `initialStock > 0`, an initial `InventoryTransaction` is created atomically in the same database transaction.

- **`GET /api/inventory/products/:id`**
  - Returns product with its last 10 inventory transactions.

- **`GET /api/inventory/low-stock`**
  - Returns all products where `currentStock <= minimumStock`.

- **`POST /api/inventory/transactions`**
  - Records stock receipt, consumption, or adjustment atomically updating `product.currentStock`.
  - **Body:**
    ```json
    {
      "productId": "cuid...",
      "type": "PURCHASE_RECEIPT",
      "quantity": 250,
      "referenceNumber": "PO-2026-0001",
      "notes": "Truck batch unloaded into Warehouse A"
    }
    ```

---

### 2.3. Sales Orders & Buyer Workflows (Lead: Kishan)
- **`GET /api/sales/orders`**
  - **Query Params:** `?status=PENDING&customerId=...`
  - Returns sales orders with customer, line items, and production order status.

- **`POST /api/sales/orders`**
  - Atomic transaction creating order and multiple line items. Can link existing customer or create a new buyer.
  - **Body:**
    ```json
    {
      "customerId": "cust_id...",
      "deliveryDeadline": "2026-10-24T00:00:00.000Z",
      "notes": "Urgent export order",
      "items": [
        {
          "productId": "prod_id...",
          "fabricType": "12oz Denim Twill",
          "color": "Indigo Blue",
          "quantity": 500,
          "unitPrice": 420
        }
      ]
    }
    ```

- **`GET /api/sales/customers`**
  - Returns list of registered buyer companies.

- **`POST /api/sales/customers`**
  - Registers a new buyer customer.

---

### 2.4. Purchase Management (Lead: Kishan - Ready for Integration)
- **`GET /api/purchase/suppliers`** — List suppliers.
- **`POST /api/purchase/suppliers`** — Register supplier.
- **`GET /api/purchase/orders`** — List yarn purchase orders.

---

### 2.5. Dispatch & Logistics (Lead: Kishan - Ready for Integration)
- **`GET /api/dispatch`** — List dispatch records with vehicle and invoice details.
- **`POST /api/dispatch`** — Create gate-out dispatch record.

---

### 2.6. Manufacturing (Lead: Teammate - Integration Contract Ready)
- **`GET /api/manufacturing/status`** — Reports integration skeleton status.
- **`GET /api/manufacturing/machines`** — List machines with current running job.
- **`GET /api/manufacturing/orders`** — List production orders on spinning/weaving/dyeing floors.
- **Agreed Teammate Implementation Endpoints:**
  - `POST /api/manufacturing/orders` — Create production order linked to `salesOrderId`.
  - `PATCH /api/manufacturing/machines/:id/status` — Transition machine state (`IDLE`, `RUNNING`, `MAINTENANCE`, `BREAKDOWN`).

---

### 2.7. Quality Control (Lead: Teammate - Integration Contract Ready)
- **`GET /api/quality/status`** — Reports integration skeleton status.
- **`GET /api/quality/inspections`** — List completed roll inspections.
- **Agreed Teammate Implementation Endpoints:**
  - `POST /api/quality/inspections` — Record roll inspection slip with defect type (`HOLES`, `COLOR_MISMATCH`, `UNEVEN_WEAVING`) and status (`PASSED`, `REWORK`, `REJECTED`).

---

### 2.8. HR & Attendance (Lead: Teammate - Integration Contract Ready)
- **`GET /api/hr/status`** — Reports integration skeleton status.
- **`GET /api/hr/employees`** — List factory employees and departments.
- **`GET /api/hr/attendance`** — List attendance records.
- **Agreed Teammate Implementation Endpoints:**
  - `POST /api/hr/attendance` — Mark daily shift attendance (`MORNING`, `EVENING`, `NIGHT`) with automated wage rate calculation.

---

### 2.9. Executive Analytics Dashboard (Joint Work)
- **`GET /api/dashboard/summary`**
  - Aggregates supply chain (products, stock warnings, orders) and factory operations (machines, floor jobs, QC pass rate, active workers) in one combined JSON payload.
