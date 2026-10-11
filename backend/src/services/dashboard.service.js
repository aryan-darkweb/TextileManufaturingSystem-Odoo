const { prisma } = require('../config/prisma');

async function getDashboardSummary() {
  // Aggregate data across Kishan and Teammate modules
  const [
    productCount,
    lowStockProducts,
    salesOrderCount,
    pendingOrdersCount,
    machineCount,
    runningMachinesCount,
    productionOrderCount,
    inspectionsCount,
    passedInspectionsCount
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({ where: { status: 'ACTIVE' } }),
    prisma.salesOrder.count(),
    prisma.salesOrder.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'] } } }),
    prisma.machine.count(),
    prisma.machine.count({ where: { status: 'RUNNING' } }),
    prisma.productionOrder.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.qualityInspection.count(),
    prisma.qualityInspection.count({ where: { status: 'PASSED' } })
  ]);

  const lowStockCount = lowStockProducts.filter((p) => p.currentStock <= p.minimumStock).length;
  const qcPassRate = inspectionsCount > 0 ? ((passedInspectionsCount / inspectionsCount) * 100).toFixed(1) : 100;

  return {
    supplyChain: {
      totalProducts: productCount,
      lowStockAlerts: lowStockCount,
      totalSalesOrders: salesOrderCount,
      activeSalesOrders: pendingOrdersCount
    },
    factoryOperations: {
      totalMachines: machineCount,
      runningMachines: runningMachinesCount,
      activeProductionOrders: productionOrderCount,
      qcInspectionsCount: inspectionsCount,
      qcPassRate: `${qcPassRate}%`,
      activeWorkers: runningMachinesCount * 2
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getDashboardSummary
};
