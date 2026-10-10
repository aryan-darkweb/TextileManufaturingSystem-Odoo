const { prisma } = require('../config/prisma');

// Teammate Owned: Quality Control - Fabric Defect Tracking & Roll Inspections
async function listInspections() {
  return await prisma.qualityInspection.findMany({
    orderBy: { inspectedAt: 'desc' },
    include: {
      productionOrder: {
        include: {
          product: true
        }
      }
    }
  });
}

async function getModuleStatus() {
  return {
    module: 'quality',
    owner: 'Teammate (Factory Operations)',
    status: 'INTEGRATION_READY_SKELETON',
    message: 'Awaiting Factory Operations defect tracking, roll tagging, and rework flows.',
    endpointsAvailable: ['GET /api/quality/inspections', 'GET /api/quality/status']
  };
}

module.exports = {
  listInspections,
  getModuleStatus
};
