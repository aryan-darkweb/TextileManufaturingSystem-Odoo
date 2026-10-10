const { prisma } = require('../config/prisma');

// Teammate Owned: Factory Operations - Machines & Production Orders
async function listMachines() {
  return await prisma.machine.findMany({
    orderBy: { code: 'asc' },
    include: {
      productionOrders: {
        where: { status: 'IN_PROGRESS' },
        take: 1
      }
    }
  });
}

async function listProductionOrders() {
  return await prisma.productionOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      machine: true,
      salesOrder: {
        include: { customer: true }
      },
      inspections: true
    }
  });
}

async function getModuleStatus() {
  return {
    module: 'manufacturing',
    owner: 'Teammate (Factory Operations)',
    status: 'INTEGRATION_READY_SKELETON',
    message: 'Awaiting Factory Operations implementation for shifts, machine scheduling, and production runs.',
    endpointsAvailable: ['GET /api/manufacturing/machines', 'GET /api/manufacturing/orders', 'GET /api/manufacturing/status']
  };
}

module.exports = {
  listMachines,
  listProductionOrders,
  getModuleStatus
};
