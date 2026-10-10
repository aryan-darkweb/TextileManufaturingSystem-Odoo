const { prisma } = require('../config/prisma');

/**
 * List employees with filtering and attendance counts.
 */
async function listEmployees(filters = {}) {
  const where = {};
  if (filters.department) where.department = filters.department;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { employeeCode: { contains: s, mode: 'insensitive' } },
      { role: { contains: s, mode: 'insensitive' } }
    ];
  }

  return await prisma.employee.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { attendances: true }
      }
    }
  });
}

/**
 * Get employee details by ID with recent attendances.
 */
async function getEmployeeById(id) {
  return await prisma.employee.findUnique({
    where: { id },
    include: {
      attendances: {
        orderBy: { date: 'desc' },
        take: 30
      }
    }
  });
}

/**
 * Create a new employee with unique code and non-negative wage.
 */
async function createEmployee(data) {
  const wage = parseFloat(data.wagePerShift);
  if (isNaN(wage) || wage < 0) {
    const err = new Error('wagePerShift must be a valid non-negative number');
    err.statusCode = 400;
    throw err;
  }

  const validDepartments = ['SPINNING', 'WEAVING', 'DYEING', 'QUALITY', 'WAREHOUSE', 'MANAGEMENT'];
  if (!validDepartments.includes(data.department)) {
    const err = new Error(`department must be one of: ${validDepartments.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return await prisma.employee.create({
    data: {
      employeeCode: data.employeeCode.trim().toUpperCase(),
      name: data.name.trim(),
      department: data.department,
      role: data.role.trim(),
      wagePerShift: wage,
      status: data.status || 'ACTIVE'
    }
  });
}

/**
 * Update an employee (or soft-delete via status = 'TERMINATED').
 */
async function updateEmployee(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.role !== undefined) updateData.role = data.role.trim();
  if (data.department !== undefined) updateData.department = data.department;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.wagePerShift !== undefined) {
    const wage = parseFloat(data.wagePerShift);
    if (isNaN(wage) || wage < 0) {
      const err = new Error('wagePerShift must be a valid non-negative number');
      err.statusCode = 400;
      throw err;
    }
    updateData.wagePerShift = wage;
  }

  return await prisma.employee.update({
    where: { id },
    data: updateData
  });
}

/**
 * Bulk record attendance for a date and shift.
 * Enforces:
 * - Reject future dates
 * - Uniqueness per [employeeId, date, shift] via upsert
 * - Automated wage calculation: PRESENT = 100%, HALF_DAY = 50%, ABSENT/LEAVE = 0
 * - LEAVE records do not mutate employee status
 */
async function recordBulkAttendance(data) {
  const { date, shift, records = [] } = data;

  if (!date) {
    const err = new Error('date is required (YYYY-MM-DD)');
    err.statusCode = 400;
    throw err;
  }

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Reject future dates (strip time from comparison)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (attendanceDate > today) {
    const err = new Error('Cannot mark attendance for future dates');
    err.statusCode = 400;
    throw err;
  }

  const validShifts = ['MORNING', 'EVENING', 'NIGHT'];
  if (!validShifts.includes(shift)) {
    const err = new Error(`shift must be one of: ${validShifts.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(records) || records.length === 0) {
    const err = new Error('records array is required and must not be empty');
    err.statusCode = 400;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch employee wage info
    const employeeIds = records.map((r) => r.employeeId);
    const employees = await tx.employee.findMany({
      where: { id: { in: employeeIds } }
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const results = [];

    for (const r of records) {
      const emp = empMap.get(r.employeeId);
      if (!emp) {
        const err = new Error(`Employee with ID ${r.employeeId} not found`);
        err.statusCode = 404;
        throw err;
      }

      const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'];
      if (!validStatuses.includes(r.status)) {
        const err = new Error(`status for employee ${emp.name} must be one of: ${validStatuses.join(', ')}`);
        err.statusCode = 400;
        throw err;
      }

      // Wage calculation formula
      let wageCalculated = 0.0;
      if (r.status === 'PRESENT') {
        wageCalculated = emp.wagePerShift;
      } else if (r.status === 'HALF_DAY') {
        wageCalculated = emp.wagePerShift * 0.5;
      } else {
        wageCalculated = 0.0;
      }

      // Upsert to enforce composite unique constraint [employeeId, date, shift]
      const attendanceRecord = await tx.attendance.upsert({
        where: {
          employeeId_date_shift: {
            employeeId: emp.id,
            date: attendanceDate,
            shift
          }
        },
        create: {
          employeeId: emp.id,
          date: attendanceDate,
          shift,
          status: r.status,
          wageCalculated
        },
        update: {
          status: r.status,
          wageCalculated
        },
        include: { employee: true }
      });

      results.push(attendanceRecord);
    }

    return results;
  });
}

/**
 * List attendance with filters.
 */
async function listAttendance(filters = {}) {
  const where = {};
  if (filters.date) {
    const d = new Date(filters.date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: d, lte: end };
  }
  if (filters.shift) where.shift = filters.shift;
  if (filters.department) {
    where.employee = { department: filters.department };
  }

  return await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      employee: true
    },
    take: 100
  });
}

/**
 * Monthly attendance and payroll summary.
 */
async function getAttendanceSummary(monthStr) {
  // e.g. '2026-10'
  const yearMonth = monthStr || new Date().toISOString().slice(0, 7);
  const [year, month] = yearMonth.split('-').map(Number);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const [attendances, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      include: { employee: true }
    }),
    prisma.employee.findMany({
      where: { status: { not: 'TERMINATED' } },
      orderBy: { name: 'asc' }
    })
  ]);

  const summaryByEmployee = employees.map((emp) => {
    const empRecords = attendances.filter((a) => a.employeeId === emp.id);
    const present = empRecords.filter((a) => a.status === 'PRESENT').length;
    const halfDay = empRecords.filter((a) => a.status === 'HALF_DAY').length;
    const absent = empRecords.filter((a) => a.status === 'ABSENT').length;
    const leave = empRecords.filter((a) => a.status === 'LEAVE').length;
    const totalWage = empRecords.reduce((sum, a) => sum + (a.wageCalculated || 0), 0);

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      department: emp.department,
      role: emp.role,
      wagePerShift: emp.wagePerShift,
      presentDays: present,
      halfDays: halfDay,
      absentDays: absent,
      leaveDays: leave,
      totalWages: totalWage
    };
  });

  const millTotals = {
    totalEmployees: employees.length,
    totalShiftsWorked: attendances.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length,
    totalPresentDays: attendances.filter((a) => a.status === 'PRESENT').length,
    totalHalfDays: attendances.filter((a) => a.status === 'HALF_DAY').length,
    totalAbsentDays: attendances.filter((a) => a.status === 'ABSENT').length,
    totalLeaveDays: attendances.filter((a) => a.status === 'LEAVE').length,
    totalWagePayout: attendances.reduce((sum, a) => sum + (a.wageCalculated || 0), 0)
  };

  return {
    month: yearMonth,
    millTotals,
    employeeSummary: summaryByEmployee
  };
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  recordBulkAttendance,
  listAttendance,
  getAttendanceSummary
};
