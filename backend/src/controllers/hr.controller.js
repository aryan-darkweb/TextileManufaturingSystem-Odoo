const hrService = require('../services/hr.service');
const { success } = require('../utils/apiResponse');

async function listEmployees(req, res, next) {
  try {
    const employees = await hrService.listEmployees(req.query);
    return success(res, employees, 'Employees retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getEmployeeById(req, res, next) {
  try {
    const employee = await hrService.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, employee, 'Employee details retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createEmployee(req, res, next) {
  try {
    const newEmployee = await hrService.createEmployee(req.body);
    return success(res, newEmployee, 'Employee registered successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const updated = await hrService.updateEmployee(req.params.id, req.body);
    return success(res, updated, 'Employee updated successfully');
  } catch (err) {
    next(err);
  }
}

async function recordBulkAttendance(req, res, next) {
  try {
    const records = await hrService.recordBulkAttendance(req.body);
    return success(res, records, 'Shift attendance recorded successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function listAttendance(req, res, next) {
  try {
    const attendance = await hrService.listAttendance(req.query);
    return success(res, attendance, 'Attendance records retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getAttendanceSummary(req, res, next) {
  try {
    const summary = await hrService.getAttendanceSummary(req.query.month);
    return success(res, summary, 'Monthly attendance summary retrieved successfully');
  } catch (err) {
    next(err);
  }
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
