const { prisma } = require('../config/prisma');
const { assertDispatchable } = require('./quality.service');

async function listDispatchRecords(filters = {}) {
  const where = {};
  if (filters.status) {
    where.status = filters.status;
  }

  return await prisma.dispatchRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      salesOrder: {
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });
}

/**
 * Get sales orders that are ready or eligible for dispatch
 */
async function getEligibleSalesOrders() {
  const orders = await prisma.salesOrder.findMany({
    where: {
      status: {
        in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP']
      }
    },
    orderBy: { deliveryDeadline: 'asc' },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              currentStock: true,
              unit: true
            }
          }
        }
      },
      dispatchRecords: true
    }
  });

  return orders.map((order) => {
    const totalOrderedQty = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalDispatchedRolls = order.dispatchRecords.reduce((sum, d) => sum + (d.dispatchedRollCount || 0), 0);
    const outstandingQty = Math.max(0, totalOrderedQty - totalDispatchedRolls);
    return {
      ...order,
      totalOrderedQty,
      totalDispatchedRolls,
      outstandingQty
    };
  });
}

async function createDispatchRecord(data) {
  // Quality Control check: ensure requested rolls do not exceed dispatch-ready passed rolls
  await assertDispatchable(data.salesOrderId, data.dispatchedRollCount);

  return await prisma.dispatchRecord.create({
    data: {
      dispatchNumber: data.dispatchNumber || `DSP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      salesOrderId: data.salesOrderId,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
      destination: data.destination,
      invoiceNumber: data.invoiceNumber || null,
      dispatchedRollCount: parseInt(data.dispatchedRollCount, 10) || 0,
      status: data.status || 'PREPARING',
      dispatchedAt: data.dispatchedAt ? new Date(data.dispatchedAt) : null
    }
  });
}

/**
 * Create and confirm dispatch for a sales order.
 * Performs atomic stock validation, stock deduction, sales order status update,
 * and inventory transaction logging to prevent double deductions.
 */
async function createAndConfirmDispatch(data) {
  const { salesOrderId, vehicleNumber, driverName, driverPhone, destination, invoiceNumber, dispatchedRollCount } = data;

  if (!salesOrderId) {
    const err = new Error('Sales order ID is required');
    err.statusCode = 400;
    throw err;
  }
  if (!vehicleNumber || typeof vehicleNumber !== 'string' || !vehicleNumber.trim()) {
    const err = new Error('Vehicle number / transport identifier is required');
    err.statusCode = 400;
    throw err;
  }
  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    const err = new Error('Destination delivery address is required');
    err.statusCode = 400;
    throw err;
  }

  // Quality Control check: ensure requested rolls do not exceed dispatch-ready passed rolls
  const qualityInfo = await assertDispatchable(salesOrderId, dispatchedRollCount);

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch sales order with line items and current stock
    const salesOrder = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: { include: { product: true } },
        customer: true,
        dispatchRecords: true
      }
    });

    if (!salesOrder) {
      const err = new Error(`Sales order with ID ${salesOrderId} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (salesOrder.status === 'DISPATCHED' || salesOrder.status === 'COMPLETED') {
      const err = new Error(`Sales order ${salesOrder.orderNumber} has already been dispatched. Duplicate dispatch prohibited.`);
      err.statusCode = 409;
      throw err;
    }

    if (salesOrder.status === 'CANCELLED') {
      const err = new Error(`Cannot dispatch a cancelled sales order (${salesOrder.orderNumber})`);
      err.statusCode = 400;
      throw err;
    }

    const rollCount = parseInt(dispatchedRollCount, 10) || 0;
    const isQualityIntegrated = qualityInfo && qualityInfo.totalInspected > 0;

    // 2. Validate stock availability for all items before any deduction
    for (const item of salesOrder.items) {
      let dispatchItemQty = item.quantity;
      if (isQualityIntegrated && rollCount > 0 && rollCount < qualityInfo.totalInspected) {
        dispatchItemQty = Math.round((item.quantity * (rollCount / qualityInfo.totalInspected)) * 100) / 100;
      }
      if (dispatchItemQty <= 0) dispatchItemQty = item.quantity;

      const availableStock = item.product.currentStock;
      if (availableStock < dispatchItemQty) {
        const err = new Error(
          `Insufficient stock to dispatch item "${item.fabricType || item.product.name}" (${item.product.code}). Required: ${dispatchItemQty} ${item.product.unit}, Available in warehouse: ${availableStock} ${item.product.unit}`
        );
        err.statusCode = 409;
        throw err;
      }
    }

    // 3. Generate dispatch number
    const count = await tx.dispatchRecord.count();
    const year = new Date().getFullYear();
    const dispatchNumber = `DSP-${year}-${String(count + 1).padStart(4, '0')}`;

    // 4. Deduct stock and log inventory transactions
    for (const item of salesOrder.items) {
      let dispatchItemQty = item.quantity;
      if (isQualityIntegrated && rollCount > 0 && rollCount < qualityInfo.totalInspected) {
        dispatchItemQty = Math.round((item.quantity * (rollCount / qualityInfo.totalInspected)) * 100) / 100;
      }
      if (dispatchItemQty <= 0) dispatchItemQty = item.quantity;

      const newStock = Math.max(0, item.product.currentStock - dispatchItemQty);

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: newStock }
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: 'DISPATCH',
          quantity: -dispatchItemQty,
          balanceAfter: newStock,
          referenceNumber: dispatchNumber,
          notes: `Dispatched against ${salesOrder.orderNumber} to ${salesOrder.customer.companyName || salesOrder.customer.name} (Vehicle: ${vehicleNumber.trim().toUpperCase()})`,
          performedBy: data.performedBy || 'Dispatch Supervisor'
        }
      });
    }

    // 5. Update sales order status
    const isFinalDispatch = !isQualityIntegrated || rollCount >= qualityInfo.totalInspected || (qualityInfo.dispatchReadyRolls - rollCount <= 0);
    if (isFinalDispatch) {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'DISPATCHED' }
      });
    }

    // 6. Create Dispatch Record
    const dispatchRecord = await tx.dispatchRecord.create({
      data: {
        dispatchNumber,
        salesOrderId,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        driverName: driverName ? driverName.trim() : null,
        driverPhone: driverPhone ? driverPhone.trim() : null,
        destination: destination.trim(),
        invoiceNumber: invoiceNumber ? invoiceNumber.trim().toUpperCase() : `INV-${year}-${salesOrder.orderNumber.replace('SO-', '')}`,
        dispatchedRollCount: rollCount,
        status: 'DISPATCHED',
        dispatchedAt: new Date()
      },
      include: {
        salesOrder: {
          include: {
            customer: true,
            items: { include: { product: true } }
          }
        }
      }
    });

    return dispatchRecord;
  });
}

module.exports = {
  listDispatchRecords,
  getEligibleSalesOrders,
  createDispatchRecord,
  createAndConfirmDispatch
};
