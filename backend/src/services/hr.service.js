const { prisma } = require('../config/prisma');

// Teammate Owned: HR & Attendance - Mill Workers, Shifts, Wage Calculations
async function listEmployees() {
  return await prisma.employee.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { attendances: true }
      }
    }
  });
}

async function listAttendance() {
  return await prisma.attendance.findMany({
    orderBy: { date: 'desc' },
    include: {
      employee: true
    },
    take: 50
  });
}

async function getModuleStatus() {
  return {
    module: 'hr',
    owner: 'Teammate (Factory Operations)',
    status: 'INTEGRATION_READY_SKELETON',
    message: 'Awaiting Factory Operations worker shift registers and wage calculation logic.',
    endpointsAvailable: ['GET /api/hr/employees', 'GET /api/hr/attendance', 'GET /api/hr/status']
  };
}

module.exports = {
  listEmployees,
  listAttendance,
  getModuleStatus
};
