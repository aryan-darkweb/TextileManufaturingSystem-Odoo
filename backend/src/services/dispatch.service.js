const { prisma } = require('../config/prisma');
const { assertDispatchable } = require('./quality.service');

async function listDispatchRecords() {
  return await prisma.dispatchRecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      salesOrder: {
        include: { customer: true }
      }
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

module.exports = {
  listDispatchRecords,
  createDispatchRecord
};
