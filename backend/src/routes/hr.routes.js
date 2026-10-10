const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hr.controller');

router.get('/employees', hrController.getEmployees);
router.get('/attendance', hrController.getAttendance);
router.get('/status', hrController.getStatus);

module.exports = router;
