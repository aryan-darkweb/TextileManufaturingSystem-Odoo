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
  return await prisma.salesOrder.findMany({
    where: {
      status: {
        in: ['READY_TO_SHIP', 'IN_PRODUCTION', 'CONFIRMED']
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
    throw new Error('Sales order ID is required');
  }
  if (!vehicleNumber || typeof vehicleNumber !== 'string') {
    throw new Error('Vehicle number / transport identifier is required');
  }
  if (!destination || typeof destination !== 'string') {
    throw new Error('Destination delivery address is required');
  }

  // Quality Control check: ensure requested rolls do not exceed dispatch-ready passed rolls
  await assertDispatchable(salesOrderId, dispatchedRollCount);

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
      throw new Error(`Sales order with ID ${salesOrderId} not found`);
    }

    if (salesOrder.status === 'DISPATCHED' || salesOrder.status === 'COMPLETED') {
      throw new Error(`Sales order ${salesOrder.orderNumber} has already been dispatched. Duplicate dispatch prohibited.`);
    }

    if (salesOrder.status === 'CANCELLED') {
      throw new Error(`Cannot dispatch a cancelled sales order (${salesOrder.orderNumber})`);
    }

    // 2. Validate stock availability for all items before any deduction
    for (const item of salesOrder.items) {
      const availableStock = item.product.currentStock;
      if (availableStock <= 0) {
        throw new Error(
          `Insufficient stock to dispatch item "${item.fabricType || item.product.name}" (${item.product.code}). Warehouse stock is depleted (0 ${item.product.unit}).`
        );
      }
    }

    // 3. Generate dispatch number
    const count = await tx.dispatchRecord.count();
    const year = new Date().getFullYear();
    const dispatchNumber = `DSP-${year}-${String(count + 1).padStart(4, '0')}`;

    // 4. Deduct stock and log inventory transactions
    for (const item of salesOrder.items) {
      const deductQty = Math.min(item.product.currentStock, item.quantity);
      const newStock = Math.max(0, item.product.currentStock - deductQty);

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: newStock }
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: 'DISPATCH',
          quantity: -deductQty,
          balanceAfter: newStock,
          referenceNumber: dispatchNumber,
          notes: `Dispatched against ${salesOrder.orderNumber} to ${salesOrder.customer.companyName || salesOrder.customer.name} (Vehicle: ${vehicleNumber})`,
          performedBy: data.performedBy || 'Dispatch Supervisor'
        }
      });
    }

    // 5. Update sales order status to DISPATCHED
    await tx.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: 'DISPATCHED' }
    });

    // 6. Create Dispatch Record
    const rollCount = parseInt(dispatchedRollCount, 10) || salesOrder.items.reduce((s, it) => s + (it.quantity > 50 ? Math.ceil(it.quantity / 50) : 1), 0);

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
