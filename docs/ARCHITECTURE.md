# TextileFlow System Architecture

## 1. Executive Summary

**TextileFlow** is the unified software platform replacing notebooks and phone calls at **Everest Textile Mills**. It integrates mill operations across raw yarn procurement, yarn spinning, fabric weaving, dyeing, quality roll inspection, finished goods warehousing, buyer order fulfillment, dispatch, and worker shift wages.

---

## 2. Technology Stack & Design Decisions

| Tier | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast HMR, responsive module-card dashboard, client-side views |
| **Styling** | Tailwind CSS | Utility-first responsive design tailored for industrial dashboards |
| **Backend** | Node.js (v24+) + Express | **ONE monolithic backend** running on port `5000` |
| **Database** | PostgreSQL hosted on Supabase | **ONE shared cloud database** for both developers |
| **ORM** | Prisma (v6+) | Type-safe schema definition, automated migrations, relational querying |
| **API** | RESTful JSON | Standardized response envelope `{ success, message, data }` |
| **Version Control** | Git + GitHub | Single monorepo shared by Kishan and teammate |

### Strict Architecture Boundaries
- **No Odoo:** Completely custom, modern, lightweight stack.
- **No FastAPI / Python Backend Services:** All functional modules execute inside the same Express process.
- **No Microservices or Multi-Port Backends:** All 8 modules share a single Express port (`5000`) and one database connection pool.
- **No Database Credentials in Frontend:** Frontend communicates strictly with Express REST endpoints; `DATABASE_URL` is never prefixed with `VITE_` or sent to the browser.

---

## 3. Architecture Topology

```mermaid
graph TD
    subgraph Client Tier
        UI[React + Vite Frontend\nhttp://localhost:5173]
    end

    subgraph Monolithic Server Tier [Single Express Server - Port 5000]
        Router["/api (Express Router)"]
        
        subgraph Supply Chain & Logistics [Kishan]
            InvRoute["/inventory"]
            SalesRoute["/sales"]
            PurRoute["/purchase"]
            DispRoute["/dispatch"]
        end
        
        subgraph Factory Operations [Teammate]
            MfgRoute["/manufacturing"]
            QcRoute["/quality"]
            HrRoute["/hr"]
        end
        
        subgraph Cross-Module [Joint]
            DashRoute["/dashboard"]
            HealthRoute["/health"]
        end
        
        PrismaClient["Prisma Client ORM (v6)"]
    end

    subgraph Data Tier [Shared Supabase PostgreSQL]
        Pooler["Supavisor Connection Pooler\nPort 6543 (DATABASE_URL)"]
        Direct["PostgreSQL Direct Connection\nPort 5432 (DIRECT_URL)"]
        Tables[("Unified Everest Textile Mills DB\n• products\n• sales_orders\n• production_orders\n• machines\n• quality_inspections\n• employees\n• attendances")]
    end

    UI -->|REST JSON| Router
    Router --> InvRoute & SalesRoute & PurRoute & DispRoute
    Router --> MfgRoute & QcRoute & HrRoute
    Router --> DashRoute & HealthRoute
    
    InvRoute & SalesRoute & PurRoute & DispRoute --> PrismaClient
    MfgRoute & QcRoute & HrRoute --> PrismaClient
    DashRoute & HealthRoute --> PrismaClient

    PrismaClient -->|Runtime Queries| Pooler
    Pooler --> Tables
    
    PrismaCLI["Prisma CLI Migrations"] -.->|Advisory Locks & DDL| Direct
    Direct -.-> Tables
```

---

## 4. Supabase Connection Strategy (Runtime vs. Migrations)

Supabase utilizes **Supavisor** for connection pooling, which requires two distinct connection strings:

1. **`DATABASE_URL` (Transaction Pooler - Port 6543):**
   - Configured with `?pgbouncer=true`.
   - Used by the running Express server and Prisma Client for normal application queries.
   - Prevents database connection exhaustion during concurrent queries.

2. **`DIRECT_URL` (Direct Connection - Port 5432):**
   - Direct connection to PostgreSQL without transaction pooling.
   - Required by Prisma CLI for `prisma migrate dev` and `prisma migrate deploy` because migration operations execute `CREATE TABLE` and acquire session-level PostgreSQL advisory locks.

In `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 5. Security & Credential Isolation

1. **Environment File Isolation:**
   - Database credentials reside exclusively in `backend/.env`.
   - Both root and subfolder `.env` files are strictly added to `.gitignore`.
2. **Credential Sanitization in Logs:**
   - Server startup logs mask connection strings (e.g. `postgresql://postgres:******@aws-0-xyz.pooler.supabase.com:6543/postgres`).
   - The `/api/health` endpoint reports connection health (`connected: true/false`) without exposing passwords, hosts, or tokens.
3. **Frontend Decoupling:**
   - The React app communicates with `http://localhost:5000/api` using `fetch`. No database drivers or keys exist in frontend code.

---

## 6. Monolithic Server Directory Organization

```
backend/
├── src/
│   ├── app.js               # Express app config, CORS, JSON parsers, route mounting
│   ├── server.js            # Port listener (5000) & startup validation
│   ├── config/
│   │   ├── env.js           # Validates required env vars; masks connection strings
│   │   └── prisma.js        # Initializes PrismaClient with safe health check
│   ├── middleware/
│   │   ├── errorHandler.js  # Centralized error handler (Prisma error mapping)
│   │   └── validate.js      # Request body schema checks
│   ├── utils/
│   │   ├── apiResponse.js   # Standard success/error JSON response envelopes
│   │   └── logger.js        # Formatted console logger
│   ├── routes/              # All 8 module route definitions
│   │   ├── index.js
│   │   ├── health.routes.js
│   │   ├── inventory.routes.js
│   │   ├── sales.routes.js
│   │   ├── purchase.routes.js
│   │   ├── dispatch.routes.js
│   │   ├── manufacturing.routes.js
│   │   ├── quality.routes.js
│   │   ├── hr.routes.js
│   │   └── dashboard.routes.js
│   ├── controllers/         # HTTP request/response handlers
│   └── services/            # Business logic & atomic Prisma transactions
├── prisma/
│   ├── schema.prisma        # Unified database schema
│   ├── migrations/          # Committed SQL migration history
│   └── seed.js              # Idempotent demo data seeder
├── package.json
└── .env.example
```
