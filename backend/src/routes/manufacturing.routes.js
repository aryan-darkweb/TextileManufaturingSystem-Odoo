const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturing.controller');

router.get('/machines', manufacturingController.getMachines);
router.get('/orders', manufacturingController.getProductionOrders);
router.get('/status', manufacturingController.getStatus);

module.exports = router;
