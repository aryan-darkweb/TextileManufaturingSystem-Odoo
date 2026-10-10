const hrService = require('../services/hr.service');
const { success } = require('../utils/apiResponse');

async function getEmployees(req, res, next) {
  try {
    const employees = await hrService.listEmployees();
    return success(res, employees, 'Employees retrieved (Teammate Factory Ops)');
  } catch (err) {
    next(err);
  }
}

async function getAttendance(req, res, next) {
  try {
    const attendance = await hrService.listAttendance();
    return success(res, attendance, 'Attendance records retrieved (Teammate Factory Ops)');
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await hrService.getModuleStatus();
    return success(res, status, 'HR integration status');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmployees,
  getAttendance,
  getStatus
};
