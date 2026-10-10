const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hr.controller');
const { validateBody } = require('../middleware/validate');

function validateCreateEmployee(body) {
  if (!body.employeeCode || typeof body.employeeCode !== 'string') {
    return 'employeeCode is required';
  }
  if (!body.name || typeof body.name !== 'string') {
    return 'name is required';
  }
  if (!body.department || typeof body.department !== 'string') {
    return 'department is required';
  }
  if (!body.role || typeof body.role !== 'string') {
    return 'role is required';
  }
  if (body.wagePerShift !== undefined && Number(body.wagePerShift) < 0) {
    return 'wagePerShift must be a non-negative number';
  }
  return null;
}

function validateBulkAttendance(body) {
  if (!body.date) {
    return 'date is required (YYYY-MM-DD)';
  }
  if (!body.shift) {
    return 'shift is required (MORNING, EVENING, NIGHT)';
  }
  if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
    return 'records array must contain at least one employee attendance record';
  }
  for (const r of body.records) {
    if (!r.employeeId) return 'Each record requires employeeId';
    if (!r.status) return 'Each record requires status';
  }
  return null;
}

// Attendance
router.get('/attendance/summary', hrController.getAttendanceSummary);
router.get('/attendance', hrController.listAttendance);
router.post('/attendance/bulk', validateBody(validateBulkAttendance), hrController.recordBulkAttendance);

// Employee CRUD
router.get('/employees', hrController.listEmployees);
router.post('/employees', validateBody(validateCreateEmployee), hrController.createEmployee);
router.get('/employees/:id', hrController.getEmployeeById);
router.patch('/employees/:id', hrController.updateEmployee);

module.exports = router;
