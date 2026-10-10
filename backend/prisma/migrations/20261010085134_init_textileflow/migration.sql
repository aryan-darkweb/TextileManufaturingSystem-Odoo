-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW_MATERIAL', 'FINISHED_GOODS', 'WIP', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('KG', 'METER', 'ROLL', 'CONE', 'PIECE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE_RECEIPT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'DISPATCH', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PREPARING', 'DISPATCHED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('SPINNING', 'WEAVING', 'DYEING', 'FINISHING');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('IDLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN');

-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('SPINNING', 'WEAVING', 'DYEING', 'FINISHING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DefectType" AS ENUM ('NONE', 'HOLES', 'COLOR_MISMATCH', 'UNEVEN_WEAVING', 'STAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PASSED', 'REWORK', 'REJECTED');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('SPINNING', 'WEAVING', 'DYEING', 'QUALITY', 'WAREHOUSE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "category" TEXT NOT NULL,
    "unit" "UnitOfMeasure" NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "minimumStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "color" TEXT,
    "specifications" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "performedBy" TEXT NOT NULL DEFAULT 'System User',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "yarnTypesSupplied" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQty" DOUBLE PRECISION NOT NULL,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDeadline" TIMESTAMP(3) NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fabricType" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_records" (
    "id" TEXT NOT NULL,
    "dispatchNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "destination" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "dispatchedRollCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PREPARING',
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MachineType" NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'IDLE',
    "capacityPerShift" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "currentShift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "productId" TEXT NOT NULL,
    "machineId" TEXT,
    "stage" "ProductionStage" NOT NULL DEFAULT 'SPINNING',
    "targetQuantity" DOUBLE PRECISION NOT NULL,
    "producedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "metersInspected" DOUBLE PRECISION NOT NULL,
    "defectType" "DefectType" NOT NULL DEFAULT 'NONE',
    "defectSeverity" TEXT DEFAULT 'MINOR',
    "status" "QualityStatus" NOT NULL DEFAULT 'PASSED',
    "inspectorName" TEXT NOT NULL DEFAULT 'QC Lead',
    "notes" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "role" TEXT NOT NULL,
    "wagePerShift" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "wageCalculated" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "sales_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_records_dispatchNumber_key" ON "dispatch_records"("dispatchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "machines_code_key" ON "machines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_orderNumber_key" ON "production_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_rollNumber_key" ON "quality_inspections"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employeeId_date_shift_key" ON "attendances"("employeeId", "date", "shift");

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_records" ADD CONSTRAINT "dispatch_records_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
