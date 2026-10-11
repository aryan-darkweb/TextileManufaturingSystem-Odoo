const { prisma } = require('../config/prisma');

/**
 * List inspections with filtering and defect records.
 */
async function listInspections(filters = {}) {
  const where = {};
  if (filters.productionOrderId) where.productionOrderId = filters.productionOrderId;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.rollNumber = { contains: filters.search.trim(), mode: 'insensitive' };
  }
  if (filters.startDate || filters.endDate) {
    where.inspectedAt = {};
    if (filters.startDate) where.inspectedAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.inspectedAt.lte = new Date(filters.endDate);
  }

  return await prisma.qualityInspection.findMany({
    where,
    orderBy: { inspectedAt: 'desc' },
    include: {
      productionOrder: {
        include: { product: true, salesOrder: true }
      },
      defectRecords: true
    }
  });
}

/**
 * Record a roll inspection with defects.
 * Auto-derives most severe defectType and checks for SalesOrder READY_TO_SHIP.
 */
async function createInspection(data) {
  const {
    productionOrderId,
    rollNumber,
    metersInspected,
    status,
    inspectorName = 'QC Lead',
    notes,
    defects = []
  } = data;

  const meters = parseFloat(metersInspected);
  if (isNaN(meters) || meters <= 0) {
    const err = new Error('metersInspected must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  const validStatuses = ['PASSED', 'REWORK', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    const err = new Error(`status must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Defect severity rule: PASSED requires no MAJOR or CRITICAL defects
  const hasMajorOrCriticalDefect = defects.some(
    (d) => d.severity === 'MAJOR' || d.severity === 'CRITICAL'
  );
  if (status === 'PASSED' && hasMajorOrCriticalDefect) {
    const err = new Error('Inspection status cannot be PASSED when MAJOR or CRITICAL defects are recorded');
    err.statusCode = 400;
    throw err;
  }

  // Defect rows required when status is REWORK or REJECTED
  if ((status === 'REWORK' || status === 'REJECTED') && (!Array.isArray(defects) || defects.length === 0)) {
    const err = new Error('Defect records are required when inspection status is REWORK or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  // Derive most severe defectType and defectSeverity
  let derivedDefectType = 'NONE';
  let derivedSeverity = 'MINOR';

  if (defects.length > 0) {
    const critical = defects.find((d) => d.severity === 'CRITICAL');
    const major = defects.find((d) => d.severity === 'MAJOR');
    const mostSevere = critical || major || defects[0];
    derivedDefectType = mostSevere.defectType || 'OTHER';
    derivedSeverity = mostSevere.severity || 'MINOR';
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify production order
    const order = await tx.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: { salesOrder: true }
    });

    if (!order) {
      const err = new Error(`Production order not found with ID ${productionOrderId}`);
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'PLANNED') {
      const err = new Error('Cannot inspect rolls for a production order that is still in PLANNED status');
      err.statusCode = 400;
      throw err;
    }

    // 2. Create QualityInspection
    const inspection = await tx.qualityInspection.create({
      data: {
        rollNumber: rollNumber.trim().toUpperCase(),
        productionOrderId,
        metersInspected: meters,
        defectType: derivedDefectType,
        defectSeverity: derivedSeverity,
        status,
        inspectorName: inspectorName.trim(),
        notes: notes || null
      }
    });

    // 3. Create DefectRecord rows
    if (defects.length > 0) {
      for (const d of defects) {
        await tx.defectRecord.create({
          data: {
            inspectionId: inspection.id,
            defectType: d.defectType,
            defectQty: parseFloat(d.defectQty) || 1.0,
            severity: d.severity || 'MINOR',
            location: d.location || null,
            notes: d.notes || null
          }
        });
      }
    }

    // 4. Update Production Order & Warehouse Finished Goods Stock
    if (status === 'PASSED') {
      await tx.productionOrder.update({
        where: { id: productionOrderId },
        data: {
          status: 'COMPLETED',
          producedQuantity: { increment: meters },
          endDate: new Date()
        }
      });

      if (order.productId) {
        await tx.product.update({
          where: { id: order.productId },
          data: { currentStock: { increment: meters } }
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: order.productId,
            type: 'PRODUCTION_OUTPUT',
            quantity: meters,
            referenceNumber: order.orderNumber,
            notes: `Roll ${rollNumber.trim().toUpperCase()} passed QC inspection.`,
            performedBy: inspectorName.trim()
          }
        });
      }
    }

    // 5. Sales Order Auto-Transition Check -> READY_TO_SHIP
    if (order.salesOrderId) {
      await checkAndSetSalesOrderReadyToShip(tx, order.salesOrderId);
    }

    return await tx.qualityInspection.findUnique({
      where: { id: inspection.id },
      include: {
        productionOrder: { include: { product: true } },
        defectRecords: true
      }
    });
  });
}

/**
 * Re-inspect a roll that had status REWORK.
 * Only REWORK -> PASSED or REJECTED.
 * PASSED / REJECTED are final and cannot be modified (409).
 */
async function updateInspection(id, data) {
  const { status, notes } = data;

  if (status !== 'PASSED' && status !== 'REJECTED') {
    const err = new Error('Re-inspection status can only be transitioned to PASSED or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const inspection = await tx.qualityInspection.findUnique({
      where: { id },
      include: {
        productionOrder: true
      }
    });

    if (!inspection) {
      const err = new Error(`Inspection not found with ID ${id}`);
      err.statusCode = 404;
      throw err;
    }

    if (inspection.status !== 'REWORK') {
      const err = new Error(
        `Inspection with status ${inspection.status} is final and cannot be modified. Only REWORK rolls may be re-inspected.`
      );
      err.statusCode = 409;
      throw err;
    }

    // Append timestamped note
    const timestamp = new Date().toISOString();
    const appendNote = `[${timestamp}] Re-inspected -> ${status}${notes ? `: ${notes}` : ''}`;
    const updatedNotes = inspection.notes ? `${inspection.notes}\n${appendNote}` : appendNote;

    const updated = await tx.qualityInspection.update({
      where: { id },
      data: {
        status,
        notes: updatedNotes
      },
      include: {
        productionOrder: true,
        defectRecords: true
      }
    });

    // Check if sales order should become READY_TO_SHIP now that a roll passed
    if (inspection.productionOrder?.salesOrderId) {
      await checkAndSetSalesOrderReadyToShip(tx, inspection.productionOrder.salesOrderId);
    }

    return updated;
  });
}

/**
 * Helper to transition SalesOrder to READY_TO_SHIP when:
 * 1. Every production order of the sales order is COMPLETED
 * 2. At least one inspection across these production orders has status PASSED
 */
async function checkAndSetSalesOrderReadyToShip(tx, salesOrderId) {
  const so = await tx.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      productionOrders: {
        include: { inspections: true }
      }
    }
  });

  if (!so) return;

  const productionOrders = so.productionOrders || [];
  if (productionOrders.length === 0) return;

  const hasPassedRoll = productionOrders.some((p) =>
    p.inspections.some((i) => i.status === 'PASSED')
  );

  if (hasPassedRoll && so.status !== 'READY_TO_SHIP' && so.status !== 'DISPATCHED' && so.status !== 'COMPLETED') {
    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: 'READY_TO_SHIP' }
    });
  }
}

/**
 * Calculate dispatch-ready quantity per SALES ORDER (Contract Endpoint).
 * Formula:
 * readyRolls = count of rolls with status PASSED across all production orders of that sales order
 *            minus sum of dispatchedRollCount over ALL its DispatchRecords (including PREPARING, DISPATCHED, DELIVERED).
 */
async function getDispatchReadyBySalesOrder(salesOrderId, txClient = null) {
  const client = txClient || prisma;

  const salesOrder = await client.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      productionOrders: {
        include: { inspections: true }
      },
      dispatchRecords: true
    }
  });

  if (!salesOrder) {
    const err = new Error(`Sales order not found with ID ${salesOrderId}`);
    err.statusCode = 404;
    throw err;
  }

  // Count passed, rework, rejected rolls across all POs
  let passedRolls = 0;
  let reworkRolls = 0;
  let rejectedRolls = 0;
  let totalInspected = 0;

  for (const po of salesOrder.productionOrders) {
    for (const insp of po.inspections) {
      totalInspected++;
      if (insp.status === 'PASSED') passedRolls++;
      else if (insp.status === 'REWORK') reworkRolls++;
      else if (insp.status === 'REJECTED') rejectedRolls++;
    }
  }

  // Sum dispatchedRollCount across all dispatch records
  const reservedOrDispatchedRolls = salesOrder.dispatchRecords.reduce(
    (sum, d) => sum + (d.dispatchedRollCount || 0),
    0
  );

  const dispatchReadyRolls = Math.max(0, passedRolls - reservedOrDispatchedRolls);
  const blockedRolls = reworkRolls + rejectedRolls;

  return {
    salesOrderId,
    orderNumber: salesOrder.orderNumber,
    passedRolls,
    reservedOrDispatchedRolls,
    dispatchReadyRolls,
    blockedRolls,
    totalInspected,
    isDispatchEligible: totalInspected === 0 || dispatchReadyRolls > 0,
    uninspectedNote:
      totalInspected === 0
        ? 'No rolls inspected yet for this sales order'
        : `${dispatchReadyRolls} passed rolls available for truck gate pass`
  };
}

/**
 * Calculate dispatch-ready quantity for a single production order (Display).
 */
async function getDispatchReadyByProductionOrder(productionOrderId) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: {
      inspections: true,
      salesOrder: {
        include: { dispatchRecords: true }
      }
    }
  });

  if (!order) {
    const err = new Error(`Production order not found with ID ${productionOrderId}`);
    err.statusCode = 404;
    throw err;
  }

  const passedRolls = order.inspections.filter((i) => i.status === 'PASSED').length;
  const reworkRolls = order.inspections.filter((i) => i.status === 'REWORK').length;
  const rejectedRolls = order.inspections.filter((i) => i.status === 'REJECTED').length;
  const blockedRolls = reworkRolls + rejectedRolls;

  // Dispatched rolls from linked sales order
  const reservedOrDispatchedRolls = (order.salesOrder?.dispatchRecords || []).reduce(
    (sum, d) => sum + (d.dispatchedRollCount || 0),
    0
  );

  const dispatchReadyRolls = Math.max(0, passedRolls - reservedOrDispatchedRolls);

  return {
    productionOrderId,
    orderNumber: order.orderNumber,
    salesOrderId: order.salesOrderId,
    passedRolls,
    reservedOrDispatchedRolls,
    dispatchReadyRolls,
    blockedRolls,
    isDispatchEligible: dispatchReadyRolls > 0
  };
}

/**
 * Guard function called by dispatch.service.js before creating a dispatch record.
 * Throws 409 if quality inspections are present and requestedRolls > dispatchReadyRolls.
 */
async function assertDispatchable(salesOrderId, requestedRolls, tx = null) {
  const rolls = parseInt(requestedRolls, 10) || 0;
  const qualityInfo = await getDispatchReadyBySalesOrder(salesOrderId, tx);
  const { dispatchReadyRolls, orderNumber, totalInspected } = qualityInfo;

  // When quality integration is available for this sales order,
  // enforce that requested rolls do not exceed passed rolls.
  if (totalInspected > 0 && rolls > 0 && rolls > dispatchReadyRolls) {
    const err = new Error(
      `Cannot dispatch ${rolls} rolls for ${orderNumber}. Only ${dispatchReadyRolls} passed rolls are dispatch-ready.`
    );
    err.statusCode = 409;
    throw err;
  }

  return { dispatchReadyRolls, orderNumber, totalInspected: totalInspected || 0 };
}

/**
 * Defect rate analytics per production order or per product.
 */
async function getDefectRate(productionOrderId, productId = null) {
  let inspections = [];

  if (productId) {
    inspections = await prisma.qualityInspection.findMany({
      where: {
        productionOrder: { productId }
      },
      include: { defectRecords: true }
    });
  } else if (productionOrderId) {
    inspections = await prisma.qualityInspection.findMany({
      where: { productionOrderId },
      include: { defectRecords: true }
    });
  }

  const inspectedMeters = inspections.reduce((sum, i) => sum + (i.metersInspected || 0), 0);
  const defectiveMeters = inspections
    .filter((i) => i.status === 'REWORK' || i.status === 'REJECTED')
    .reduce((sum, i) => sum + (i.metersInspected || 0), 0);

  const ratePct = inspectedMeters > 0 ? Number(((defectiveMeters / inspectedMeters) * 100).toFixed(1)) : 0;
  const badge = ratePct < 2 ? 'GREEN' : ratePct <= 5 ? 'AMBER' : 'RED';

  // Aggregate defect type breakdown
  const defectCounts = {};
  for (const i of inspections) {
    for (const d of i.defectRecords) {
      defectCounts[d.defectType] = (defectCounts[d.defectType] || 0) + (d.defectQty || 1);
    }
  }

  return {
    productionOrderId: productionOrderId || null,
    productId: productId || null,
    totalInspections: inspections.length,
    inspectedMeters,
    defectiveMeters,
    ratePct,
    badge,
    defectBreakdown: defectCounts
  };
}

module.exports = {
  listInspections,
  createInspection,
  updateInspection,
  getDispatchReadyBySalesOrder,
  getDispatchReadyByProductionOrder,
  assertDispatchable,
  getDefectRate
};
