-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'LEAVE';

-- CreateTable
CREATE TABLE "production_stage_logs" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "machineId" TEXT,
    "operatorId" TEXT,
    "status" "ProductionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "inputQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outputQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "wasteQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outputTransactionId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_stage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_consumptions" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "unit" "UnitOfMeasure" NOT NULL,
    "inventoryTransactionId" TEXT,
    "isDeducted" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "material_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_records" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "defectType" "DefectType" NOT NULL,
    "defectQty" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_stage_logs_productionOrderId_idx" ON "production_stage_logs"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "production_stage_logs_productionOrderId_stage_key" ON "production_stage_logs"("productionOrderId", "stage");

-- CreateIndex
CREATE INDEX "material_consumptions_productionOrderId_idx" ON "material_consumptions"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "material_consumptions_productionOrderId_rawMaterialId_stage_key" ON "material_consumptions"("productionOrderId", "rawMaterialId", "stage");

-- CreateIndex
CREATE INDEX "defect_records_inspectionId_idx" ON "defect_records"("inspectionId");

-- AddForeignKey
ALTER TABLE "production_stage_logs" ADD CONSTRAINT "production_stage_logs_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stage_logs" ADD CONSTRAINT "production_stage_logs_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stage_logs" ADD CONSTRAINT "production_stage_logs_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_records" ADD CONSTRAINT "defect_records_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
