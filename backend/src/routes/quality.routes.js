const express = require('express');
const router = express.Router();
const qualityController = require('../controllers/quality.controller');

router.get('/inspections', qualityController.getInspections);
router.get('/status', qualityController.getStatus);

module.exports = router;
