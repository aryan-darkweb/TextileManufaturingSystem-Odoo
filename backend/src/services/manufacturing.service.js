const { prisma } = require('../config/prisma');

/**
 * Private helper to record inventory transactions inside an existing Prisma transaction.
 * Rejects operations that would drive stock below zero.
 */
async function recordStockTransactionTx(tx, {
  productId,
  quantity,
  type,
  referenceNumber,
  notes,
  performedBy = 'System User'
}) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) {
    const err = new Error(`Product not found with ID ${productId}`);
    err.statusCode = 404;
    throw err;
  }

  const newStock = product.currentStock + quantity;
  if (newStock < 0) {
    const err = new Error(
      `Insufficient inventory stock for ${product.name} (${product.code}). Current: ${product.currentStock}, required reduction: ${Math.abs(quantity)}`
    );
    err.statusCode = 409;
    throw err;
  }

  await tx.product.update({
    where: { id: product.id },
    data: { currentStock: newStock }
  });

  const transaction = await tx.inventoryTransaction.create({
    data: {
      productId: product.id,
      type,
      quantity,
      balanceAfter: newStock,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
      performedBy
    }
  });

  return transaction;
}

// Stage Progression Sequence
const STAGES = ['SPINNING', 'WEAVING', 'DYEING', 'FINISHING'];

/**
 * Create a new production order linked to an optional sales order and product.
 * Initializes planned MaterialConsumption rows in one atomic transaction.
 */
async function createProductionOrder(data) {
  const { salesOrderId, productId, targetQuantity, machineId, startDate, materials = [], notes } = data;

  const targetQty = parseFloat(targetQuantity);
  if (isNaN(targetQty) || targetQty <= 0) {
    const err = new Error('targetQuantity must be a valid number greater than zero');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Validate Product exists
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      const err = new Error(`Product not found with ID ${productId}`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Validate SalesOrder if provided
    let salesOrder = null;
    if (salesOrderId) {
      salesOrder = await tx.salesOrder.findUnique({ where: { id: salesOrderId } });
      if (!salesOrder) {
        const err = new Error(`Sales order not found with ID ${salesOrderId}`);
        err.statusCode = 404;
        throw err;
      }
    }

    // 3. Generate unique orderNumber PO-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await tx.productionOrder.count();
    const orderNumber = data.orderNumber || `PO-${year}-${String(count + 1).padStart(4, '0')}`;

    // 4. Create ProductionOrder
    const newOrder = await tx.productionOrder.create({
      data: {
        orderNumber,
        salesOrderId: salesOrderId || null,
        productId,
        machineId: machineId || null,
        stage: 'SPINNING',
        status: 'PLANNED',
        targetQuantity: targetQty,
        producedQuantity: 0.0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: null
      }
    });

    // 5. Create planned MaterialConsumption rows
    if (Array.isArray(materials) && materials.length > 0) {
      for (const mat of materials) {
        const rawProd = await tx.product.findUnique({ where: { id: mat.rawMaterialId } });
        if (!rawProd) {
          const err = new Error(`Raw material product not found with ID ${mat.rawMaterialId}`);
          err.statusCode = 404;
          throw err;
        }

        const plannedQty = parseFloat(mat.plannedQuantity);
        if (isNaN(plannedQty) || plannedQty <= 0) {
          const err = new Error(`Planned quantity for raw material ${rawProd.code} must be greater than zero`);
          err.statusCode = 400;
          throw err;
        }

        await tx.materialConsumption.create({
          data: {
            productionOrderId: newOrder.id,
            rawMaterialId: mat.rawMaterialId,
            stage: mat.stage || 'SPINNING',
            plannedQuantity: plannedQty,
            actualQuantity: 0.0,
            unit: mat.unit || rawProd.unit,
            isDeducted: false,
            notes: mat.notes || null
          }
        });
      }
    }

    return await tx.productionOrder.findUnique({
      where: { id: newOrder.id },
      include: {
        product: true,
        salesOrder: { include: { customer: true } },
        materialConsumptions: { include: { rawMaterial: true } }
      }
    });
  });
}

/**
 * List production orders with filtering and progress percentage.
 */
async function listProductionOrders(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.stage) where.stage = filters.stage;
  if (filters.salesOrderId) where.salesOrderId = filters.salesOrderId;
  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: s, mode: 'insensitive' } },
      { product: { name: { contains: s, mode: 'insensitive' } } },
      { product: { code: { contains: s, mode: 'insensitive' } } },
      { salesOrder: { orderNumber: { contains: s, mode: 'insensitive' } } }
    ];
  }

  const orders = await prisma.productionOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      salesOrder: { include: { customer: true } },
      machine: true,
      stageLogs: {
        orderBy: { createdAt: 'asc' }
      },
      inspections: true
    }
  });

  return orders.map((order) => {
    const progressPct =
      order.targetQuantity > 0 ? Math.min(100, Math.round((order.producedQuantity / order.targetQuantity) * 100)) : 0;
    return {
      ...order,
      progressPct
    };
  });
}

/**
 * Get detailed production order with stage history, material consumption, and defect metrics.
 */
async function getProductionOrderById(id) {
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      product: true,
      salesOrder: {
        include: {
          customer: true,
          dispatchRecords: true
        }
      },
      machine: true,
      stageLogs: {
        orderBy: { createdAt: 'asc' },
        include: { machine: true, operator: true }
      },
      materialConsumptions: {
        include: { rawMaterial: true }
      },
      inspections: {
        orderBy: { inspectedAt: 'desc' },
        include: { defectRecords: true }
      }
    }
  });

  if (!order) return null;

  // Compute defect metrics
  const inspections = order.inspections || [];
  const totalMeters = inspections.reduce((acc, i) => acc + (i.metersInspected || 0), 0);
  const defectiveMeters = inspections
    .filter((i) => i.status === 'REWORK' || i.status === 'REJECTED')
    .reduce((acc, i) => acc + (i.metersInspected || 0), 0);
  const defectRate = totalMeters > 0 ? Number(((defectiveMeters / totalMeters) * 100).toFixed(1)) : 0;
  const defectBadge = defectRate < 2 ? 'GREEN' : defectRate <= 5 ? 'AMBER' : 'RED';

  // Compute dispatch-ready count for this order
  const passedRolls = inspections.filter((i) => i.status === 'PASSED').length;
  const reworkRolls = inspections.filter((i) => i.status === 'REWORK').length;
  const rejectedRolls = inspections.filter((i) => i.status === 'REJECTED').length;

  const progressPct =
    order.targetQuantity > 0 ? Math.min(100, Math.round((order.producedQuantity / order.targetQuantity) * 100)) : 0;

  return {
    ...order,
    progressPct,
    metrics: {
      inspectedRolls: inspections.length,
      passedRolls,
      reworkRolls,
      rejectedRolls,
      totalMeters,
      defectiveMeters,
      defectRate,
      defectBadge
    }
  };
}

/**
 * Full traceability endpoint for an order.
 */
async function getOrderTrace(id) {
  const order = await getProductionOrderById(id);
  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    stage: order.stage,
    product: {
      id: order.product.id,
      code: order.product.code,
      name: order.product.name,
      category: order.product.category,
      unit: order.product.unit
    },
    salesOrder: order.salesOrder
      ? {
          id: order.salesOrder.id,
          orderNumber: order.salesOrder.orderNumber,
          status: order.salesOrder.status,
          deliveryDeadline: order.salesOrder.deliveryDeadline,
          customer: order.salesOrder.customer
        }
      : null,
    materialsConsumed: order.materialConsumptions.map((m) => ({
      rawMaterial: `${m.rawMaterial.name} (${m.rawMaterial.code})`,
      stage: m.stage,
      plannedQuantity: m.plannedQuantity,
      actualQuantity: m.actualQuantity,
      unit: m.unit,
      isDeducted: m.isDeducted
    })),
    stageHistory: order.stageLogs.map((s) => ({
      stage: s.stage,
      status: s.status,
      machine: s.machine ? `${s.machine.name} (${s.machine.code})` : 'Unassigned',
      operator: s.operator ? `${s.operator.name} (${s.operator.employeeCode})` : 'Unassigned',
      inputQuantity: s.inputQuantity,
      outputQuantity: s.outputQuantity,
      wasteQuantity: s.wasteQuantity,
      startedAt: s.startedAt,
      completedAt: s.completedAt
    })),
    inspections: order.inspections.map((i) => ({
      rollNumber: i.rollNumber,
      status: i.status,
      metersInspected: i.metersInspected,
      inspector: i.inspectorName,
      inspectedAt: i.inspectedAt,
      defects: i.defectRecords
    }))
  };
}

/**
 * Start execution of the current stage for a production order.
 */
async function startStage(orderId, data = {}) {
  const { machineId, operatorId, notes } = data;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: orderId },
      include: { stageLogs: { orderBy: { createdAt: 'asc' } } }
    });

    if (!order) {
      const err = new Error(`Production order not found with ID ${orderId}`);
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'COMPLETED') {
      const err = new Error('Cannot start stage on an already COMPLETED production order');
      err.statusCode = 409;
      throw err;
    }

    const currentStage = order.stage;
    if (currentStage === 'COMPLETED') {
      const err = new Error('Order is already in COMPLETED stage');
      err.statusCode = 409;
      throw err;
    }

    // Check if an in-progress log already exists for this stage
    const activeLog = order.stageLogs.find((l) => l.stage === currentStage && l.status === 'IN_PROGRESS');
    if (activeLog) {
      const err = new Error(`Stage ${currentStage} is already in progress`);
      err.statusCode = 409;
      throw err;
    }

    // Check sequence: if not SPINNING, previous stage log must be COMPLETED
    const stageIdx = STAGES.indexOf(currentStage);
    let inputQuantity = order.targetQuantity;

    if (stageIdx > 0) {
      const prevStage = STAGES[stageIdx - 1];
      const prevLog = order.stageLogs.find((l) => l.stage === prevStage && l.status === 'COMPLETED');
      if (!prevLog) {
        const err = new Error(`Previous stage (${prevStage}) must be COMPLETED before starting ${currentStage}`);
        err.statusCode = 409;
        throw err;
      }
      inputQuantity = prevLog.outputQuantity;
    }

    // Validate machine if provided
    let assignedMachineId = machineId || order.machineId;
    if (assignedMachineId) {
      const machine = await tx.machine.findUnique({ where: { id: assignedMachineId } });
      if (!machine) {
        const err = new Error(`Machine not found with ID ${assignedMachineId}`);
        err.statusCode = 404;
        throw err;
      }
      if (machine.type !== currentStage) {
        const err = new Error(`Machine type ${machine.type} does not match current stage ${currentStage}`);
        err.statusCode = 400;
        throw err;
      }

      await tx.machine.update({
        where: { id: machine.id },
        data: { status: 'RUNNING' }
      });
    }

    // Validate operator if provided
    if (operatorId) {
      const operator = await tx.employee.findUnique({ where: { id: operatorId } });
      if (!operator) {
        const err = new Error(`Employee not found with ID ${operatorId}`);
        err.statusCode = 404;
        throw err;
      }
    }

    // Create stage log
    const stageLog = await tx.productionStageLog.create({
      data: {
        productionOrderId: order.id,
        stage: currentStage,
        machineId: assignedMachineId || null,
        operatorId: operatorId || null,
        status: 'IN_PROGRESS',
        inputQuantity,
        outputQuantity: 0.0,
        wasteQuantity: 0.0,
        startedAt: new Date(),
        notes: notes || null
      }
    });

    // Update order status and start date
    await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        status: 'IN_PROGRESS',
        machineId: assignedMachineId || null,
        startDate: order.startDate || new Date()
      }
    });

    // If order has a linked sales order, transition to IN_PRODUCTION if PENDING/CONFIRMED
    if (order.salesOrderId) {
      const so = await tx.salesOrder.findUnique({ where: { id: order.salesOrderId } });
      if (so && (so.status === 'PENDING' || so.status === 'CONFIRMED')) {
        await tx.salesOrder.update({
          where: { id: so.id },
          data: { status: 'IN_PRODUCTION' }
        });
      }
    }

    return stageLog;
  });
}

/**
 * Complete execution of the active stage.
 * Deducts raw materials, frees machine, advances stage or completes order with output stock.
 */
async function completeStage(orderId, data = {}) {
  const { outputQuantity, wasteQuantity = 0, actuals = [], notes } = data;

  const outQty = parseFloat(outputQuantity);
  if (isNaN(outQty) || outQty <= 0) {
    const err = new Error('outputQuantity must be a valid number greater than zero');
    err.statusCode = 400;
    throw err;
  }
  const wasteQty = parseFloat(wasteQuantity) || 0.0;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        stageLogs: true,
        materialConsumptions: true
      }
    });

    if (!order) {
      const err = new Error(`Production order not found with ID ${orderId}`);
      err.statusCode = 404;
      throw err;
    }

    const currentStage = order.stage;
    const activeLog = order.stageLogs.find((l) => l.stage === currentStage && l.status === 'IN_PROGRESS');
    if (!activeLog) {
      const err = new Error(`No in-progress stage log found for stage ${currentStage}`);
      err.statusCode = 409;
      throw err;
    }

    if (outQty > activeLog.inputQuantity) {
      const err = new Error(
        `Output quantity (${outQty}) cannot exceed input quantity (${activeLog.inputQuantity})`
      );
      err.statusCode = 409;
      throw err;
    }

    // 1. Deduct raw material consumptions for this stage that haven't been deducted yet
    const stageConsumptions = order.materialConsumptions.filter(
      (m) => m.stage === currentStage && !m.isDeducted
    );

    for (const consumption of stageConsumptions) {
      const actualOverride = actuals.find((a) => a.rawMaterialId === consumption.rawMaterialId);
      const actualQty = actualOverride ? parseFloat(actualOverride.actualQuantity) : consumption.plannedQuantity;

      if (actualQty > 0) {
        const invTx = await recordStockTransactionTx(tx, {
          productId: consumption.rawMaterialId,
          quantity: -actualQty,
          type: 'PRODUCTION_CONSUMPTION',
          referenceNumber: order.orderNumber,
          notes: `Material consumption for ${order.orderNumber} stage ${currentStage}`,
          performedBy: 'Factory Operations'
        });

        await tx.materialConsumption.update({
          where: { id: consumption.id },
          data: {
            actualQuantity: actualQty,
            isDeducted: true,
            inventoryTransactionId: invTx.id
          }
        });
      }
    }

    // 2. Free up machine
    if (activeLog.machineId) {
      await tx.machine.update({
        where: { id: activeLog.machineId },
        data: { status: 'IDLE' }
      });
    }

    // 3. Close the stage log
    const stageIdx = STAGES.indexOf(currentStage);
    const isLastStage = stageIdx === STAGES.length - 1; // FINISHING

    let outputTxId = null;

    // 4. If completing FINISHING: order finishes, add finished goods stock
    if (isLastStage) {
      const outputTx = await recordStockTransactionTx(tx, {
        productId: order.productId,
        quantity: outQty,
        type: 'PRODUCTION_OUTPUT',
        referenceNumber: order.orderNumber,
        notes: `Finished goods production output for ${order.orderNumber}`,
        performedBy: 'Factory Operations'
      });
      outputTxId = outputTx.id;

      await tx.productionStageLog.update({
        where: { id: activeLog.id },
        data: {
          status: 'COMPLETED',
          outputQuantity: outQty,
          wasteQuantity: wasteQty,
          completedAt: new Date(),
          outputTransactionId: outputTxId,
          notes: notes ? `${activeLog.notes || ''}\n${notes}`.trim() : activeLog.notes
        }
      });

      await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          stage: 'COMPLETED',
          status: 'COMPLETED',
          producedQuantity: outQty,
          endDate: new Date()
        }
      });
    } else {
      // Advance to next stage
      const nextStage = STAGES[stageIdx + 1];

      await tx.productionStageLog.update({
        where: { id: activeLog.id },
        data: {
          status: 'COMPLETED',
          outputQuantity: outQty,
          wasteQuantity: wasteQty,
          completedAt: new Date(),
          notes: notes ? `${activeLog.notes || ''}\n${notes}`.trim() : activeLog.notes
        }
      });

      await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          stage: nextStage,
          status: 'IN_PROGRESS',
          producedQuantity: outQty
        }
      });
    }

    return await tx.productionOrder.findUnique({
      where: { id: order.id },
      include: {
        stageLogs: { orderBy: { createdAt: 'asc' } },
        materialConsumptions: true
      }
    });
  });
}

/**
 * Pause or Resume production order status.
 */
async function updateOrderStatus(orderId, status) {
  if (status !== 'PAUSED' && status !== 'IN_PROGRESS') {
    const err = new Error('Status can only be updated to PAUSED or IN_PROGRESS via this endpoint');
    err.statusCode = 400;
    throw err;
  }

  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error(`Production order not found with ID ${orderId}`);
    err.statusCode = 404;
    throw err;
  }

  if (order.status === 'COMPLETED') {
    const err = new Error('Cannot change status of a COMPLETED order');
    err.statusCode = 409;
    throw err;
  }

  return await prisma.productionOrder.update({
    where: { id: orderId },
    data: { status }
  });
}

/**
 * Production status summary for Kishan's Sales Order integration.
 */
async function getStatusBySalesOrder(salesOrderId) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      productionOrders: {
        include: {
          stageLogs: true
        }
      }
    }
  });

  if (!salesOrder) {
    const err = new Error(`Sales order not found with ID ${salesOrderId}`);
    err.statusCode = 404;
    throw err;
  }

  const productionOrders = salesOrder.productionOrders.map((po) => {
    const progressPct =
      po.targetQuantity > 0 ? Math.min(100, Math.round((po.producedQuantity / po.targetQuantity) * 100)) : 0;
    return {
      id: po.id,
      orderNumber: po.orderNumber,
      stage: po.stage,
      status: po.status,
      targetQuantity: po.targetQuantity,
      producedQuantity: po.producedQuantity,
      progressPct
    };
  });

  let totalTarget = 0;
  let totalProduced = 0;
  for (const po of productionOrders) {
    totalTarget += po.targetQuantity;
    totalProduced += po.producedQuantity;
  }
  const overallProgressPct =
    totalTarget > 0 ? Math.min(100, Math.round((totalProduced / totalTarget) * 100)) : 0;

  const currentStages = [...new Set(productionOrders.map((p) => p.stage))];
  const overallStage = currentStages.length === 1 ? currentStages[0] : currentStages.join(' / ') || 'NOT_STARTED';

  return {
    salesOrderId,
    orderNumber: salesOrder.orderNumber,
    salesOrderStatus: salesOrder.status,
    productionOrders,
    overallStage,
    overallProgressPct,
    estimatedNote:
      overallProgressPct === 100
        ? 'All production batches completed'
        : `${overallProgressPct}% complete across factory floor`
  };
}

/**
 * Raw material requirement vs current inventory availability for an order.
 */
async function getMaterialRequirementVsAvailable(productionOrderId) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: {
      materialConsumptions: {
        include: { rawMaterial: true }
      }
    }
  });

  if (!order) {
    const err = new Error(`Production order not found with ID ${productionOrderId}`);
    err.statusCode = 404;
    throw err;
  }

  const materials = order.materialConsumptions.map((m) => {
    const availableStock = m.rawMaterial.currentStock;
    const required = m.plannedQuantity;
    const consumed = m.actualQuantity;
    const needed = m.isDeducted ? 0 : required;
    const shortage = Math.max(0, needed - availableStock);
    const status = shortage > 0 ? 'SHORT' : 'OK';

    return {
      rawMaterialId: m.rawMaterial.id,
      rawMaterialCode: m.rawMaterial.code,
      name: m.rawMaterial.name,
      stage: m.stage,
      unit: m.unit,
      plannedQuantity: required,
      actualConsumed: consumed,
      isDeducted: m.isDeducted,
      availableStock,
      shortage,
      status
    };
  });

  return {
    productionOrderId,
    orderNumber: order.orderNumber,
    materials
  };
}

/**
 * List machines with active running production order.
 */
async function listMachines() {
  return await prisma.machine.findMany({
    orderBy: { code: 'asc' },
    include: {
      productionOrders: {
        where: { status: 'IN_PROGRESS' },
        take: 1,
        include: { product: true }
      }
    }
  });
}

/**
 * Update machine status.
 */
async function updateMachineStatus(id, status) {
  const allowed = ['IDLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN'];
  if (!allowed.includes(status)) {
    const err = new Error(`Invalid machine status. Allowed: ${allowed.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return await prisma.machine.update({
    where: { id },
    data: { status }
  });
}

/**
 * Factory Today executive dashboard snapshot.
 */
async function getFactoryToday() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    orders,
    machines,
    qualityAlerts,
    attendances,
    lowStockProducts,
    overdueOrders
  ] = await Promise.all([
    prisma.productionOrder.findMany({ select: { stage: true, status: true } }),
    prisma.machine.findMany({ select: { status: true } }),
    prisma.qualityInspection.findMany({
      where: { status: { in: ['REWORK', 'REJECTED'] } },
      select: { status: true, rollNumber: true, productionOrderId: true }
    }),
    prisma.attendance.findMany({
      where: { date: { gte: todayStart } },
      select: { status: true }
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { currentStock: true, minimumStock: true }
    }),
    prisma.salesOrder.count({
      where: {
        deliveryDeadline: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'DISPATCHED'] }
      }
    })
  ]);

  const stageCounts = {
    SPINNING: 0,
    WEAVING: 0,
    DYEING: 0,
    FINISHING: 0,
    COMPLETED: 0
  };
  for (const o of orders) {
    if (stageCounts[o.stage] !== undefined) stageCounts[o.stage]++;
  }

  const machineStatus = {
    RUNNING: machines.filter((m) => m.status === 'RUNNING').length,
    IDLE: machines.filter((m) => m.status === 'IDLE').length,
    MAINTENANCE: machines.filter((m) => m.status === 'MAINTENANCE').length,
    BREAKDOWN: machines.filter((m) => m.status === 'BREAKDOWN').length
  };

  const attendanceToday = {
    present: attendances.filter((a) => a.status === 'PRESENT').length,
    halfDay: attendances.filter((a) => a.status === 'HALF_DAY').length,
    absent: attendances.filter((a) => a.status === 'ABSENT').length,
    leave: attendances.filter((a) => a.status === 'LEAVE').length
  };

  const lowStockCount = lowStockProducts.filter((p) => p.currentStock <= p.minimumStock).length;

  return {
    stageCounts,
    machineStatus,
    qualityAlerts: {
      totalAlertRolls: qualityAlerts.length,
      reworkRolls: qualityAlerts.filter((q) => q.status === 'REWORK').length,
      rejectedRolls: qualityAlerts.filter((q) => q.status === 'REJECTED').length
    },
    attendanceToday,
    lowStockCount,
    overdueSalesOrdersCount: overdueOrders,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  createProductionOrder,
  listProductionOrders,
  getProductionOrderById,
  getOrderTrace,
  startStage,
  completeStage,
  updateOrderStatus,
  getStatusBySalesOrder,
  getMaterialRequirementVsAvailable,
  listMachines,
  updateMachineStatus,
  getFactoryToday,
  recordStockTransactionTx
};
