# TextileFlow — Everest Textile Mills Digital Backbone

> **Unified Textile Manufacturing & Supply Chain Management System**  
> Replacing notebooks, phone calls, and paper slips with a monolithic Express application and a single shared Supabase PostgreSQL database.

---

## 1. Technology Stack

- **Frontend:** React 19 + Vite 8
- **UI & Styling:** Tailwind CSS + Lucide Icons + Responsive Industrial UI
- **Backend:** Node.js (v24.13+) + Express (v4.21+) — **ONE Monolithic Backend Server** on port `5000`
- **Database:** Supabase-hosted PostgreSQL — **ONE Shared Database**
- **ORM:** Prisma (v6.4+)
- **API:** RESTful JSON Architecture
- **Version Control:** Git + GitHub (Single Repository)

### Architecture Rules Enforced
- ❌ **No Odoo**
- ❌ **No FastAPI / Python Backend Services / Microservices**
- ❌ **No multiple backend ports** — All 8 modules run in the same Express application on port `5000`.
- ❌ **No exposed database credentials** — Database URLs are kept in `backend/.env` only and never exposed to React/Vite.

---

## 2. Team Module Ownership

| Lead Developer | Responsibilities | Modules |
| :--- | :--- | :--- |
| **Kishan** | Supply Chain & Integration Head | • Architecture & Shared Database Setup<br>• Inventory Management & Low-Stock Alerts<br>• Purchase Orders (Yarn suppliers at the gate)<br>• Sales Orders (Buyer fabric requirements & deadlines)<br>• Dispatch & Logistics (Truck rolls & invoices)<br>• Integration Contracts & Shared Schema |
| **Teammate** | Factory Operations Lead | • Manufacturing (Machines: Spinning, Weaving, Dyeing)<br>• Floor Production Orders<br>• Quality Control (Roll defect inspections)<br>• HR & Floor Worker Attendance (Shifts & Wages) |
| **Joint Work** | Cross-Module Integration | • Executive Dashboard (Order-to-cash & Profitability)<br>• End-to-End Workflow Data Consistency<br>• Shared Database Coordination & Verification |

---

## 3. Directory Structure

```
TextileFlow/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express application configuration
│   │   ├── server.js            # Port 5000 listener & startup validation
│   │   ├── config/
│   │   │   ├── env.js           # Environment validation & credential masking
│   │   │   └── prisma.js        # Prisma client with non-leaking health check
│   │   ├── middleware/
│   │   │   ├── errorHandler.js  # Centralized error handler
│   │   │   └── validate.js      # Request body validation
│   │   ├── routes/              # All 8 module routes inside ONE server
│   │   ├── controllers/         # Request/response logic
│   │   ├── services/            # Business logic & atomic transactions
│   │   └── utils/
│   │       ├── apiResponse.js   # Standard JSON envelope
│   │       └── logger.js        # Credential-safe console logger
│   ├── prisma/
│   │   ├── schema.prisma        # Complete shared Prisma schema
│   │   ├── seed.js              # Idempotent demo data seeder
│   │   └── migrations/          # Version-controlled migration history
│   ├── package.json
│   ├── .env.example
│   └── .env                     # (Ignored by Git - paste Supabase URL here)
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main tab controller & health listener
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Header with live Supabase status pill
│   │   │   ├── HealthModal.jsx  # Safe system & database health viewer
│   │   │   ├── ModuleGrid.jsx   # App-grid homepage with module cards
│   │   │   ├── InventoryView.jsx# Product listing & creation workflow
│   │   │   ├── SalesOrdersView.jsx # Buyer sales order creation flow
│   │   │   ├── FactoryOpsSkeletonView.jsx # Teammate module skeletons
│   │   │   └── ArchitectureDocsView.jsx   # In-app architecture reference
│   │   └── services/
│   │       └── api.js           # REST API client
│   ├── package.json
│   └── tailwind.config.js
├── docs/
│   ├── ARCHITECTURE.md          # Monolithic architecture & Supabase pooling details
│   ├── DATA_MODEL.md            # Complete Prisma schema & ER diagram
│   ├── MODULE_OWNERSHIP.md      # Responsibilities & code file ownership
│   └── INTEGRATION_CONTRACT.md  # Standardized REST endpoint specifications
├── package.json                 # Convenient root scripts
├── .env.example                 # Root environment template
└── .gitignore                   # Ignores .env, node_modules, build outputs
```

---

## 4. Setup Guide for Kishan (Initial Setup)

### Step 1: Configure Supabase Database
1. Go to [supabase.com](https://supabase.com) and open your project.
2. In Project Settings → Database:
   - Copy the **Connection String (Transaction Pooler - Port 6543)**.
   - Copy the **Direct Connection String (Session Mode - Port 5432)**.
3. Open `backend/.env` in your local workspace:
   ```env
   PORT=5000
   NODE_ENV=development

   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

   CORS_ORIGIN="http://localhost:5173"
   ```

### Step 2: Apply Migrations & Seed Demo Data
Once your actual Supabase credentials are in `backend/.env`:
```powershell
# In backend/ directory:
cd backend

# Generate Prisma Client
npm run prisma:generate

# Apply initial migration to Supabase PostgreSQL
npx prisma migrate dev --name init_textileflow

# Seed safe demo products, customers, machines, and employees
npm run seed
```

### Step 3: Start the Backend & Frontend
In terminal 1 (Backend):
```powershell
cd backend
npm run dev
# Running at http://localhost:5000
```

In terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
# Running at http://localhost:5173
```

---

## 5. Onboarding Instructions for Teammate (Factory Operations)

To collaborate on the shared database and monolithic server:

1. **Clone the same GitHub repository:**
   ```powershell
   git clone <YOUR_GITHUB_REPO_URL>
   cd TextileFlow
   ```
2. **Install dependencies:**
   ```powershell
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
3. **Configure local `backend/.env`:**
   - Create `backend/.env` by copying `backend/.env.example`.
   - Ask Kishan for the shared Supabase `DATABASE_URL` and `DIRECT_URL`.
   - Paste the connection strings into your `backend/.env`.
4. **Generate Prisma Client:**
   ```powershell
   cd backend
   npx prisma generate
   ```
5. **Start your local backend and frontend:**
   - Both developers run Express locally on port `5000`.
   - Both connect to the **same Supabase PostgreSQL database**.
   - Any record you create (e.g. Machine or Production Order) is instantly accessible to Kishan, and any Sales Order Kishan creates is immediately accessible to you!
6. **Implement your assigned modules:**
   - `backend/src/services/manufacturing.service.js`
   - `backend/src/services/quality.service.js`
   - `backend/src/services/hr.service.js`
   - Refer to [`docs/INTEGRATION_CONTRACT.md`](./docs/INTEGRATION_CONTRACT.md) for agreed payload shapes.

---

## 6. Shared Database & Migration Rules

1. **Commit Every Migration:** Run `npx prisma migrate dev --name <migration_name>` and commit the resulting SQL directory in `backend/prisma/migrations/`.
2. **Never Use `prisma db push`:** Always use the coordinated migration workflow to prevent drift between developers.
3. **Never Reset Shared DB:** Do not run `prisma migrate reset` or drop the shared Supabase database.
4. **Use Transactions for Multi-Record Updates:** Use `prisma.$transaction` for operations that alter multiple records (e.g., placing sales orders or adjusting stock).

---

## 7. API Health Verification

The backend exposes a credential-safe health endpoint:
- **URL:** `GET http://localhost:5000/api/health`
- **Behavior:**
  - If `DATABASE_URL` contains placeholder: Returns HTTP 200 with `status: "degraded"` and friendly guidance.
  - When valid Supabase string is present: Returns HTTP 200 with `status: "healthy"` and `connected: true`.
  - Credentials and passwords are **never disclosed**.
