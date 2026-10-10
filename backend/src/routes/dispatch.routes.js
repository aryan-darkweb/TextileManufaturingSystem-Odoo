const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatch.controller');

router.get('/', dispatchController.getDispatches);
router.get('/eligible-orders', dispatchController.getEligibleOrders);
router.post('/', dispatchController.createDispatch);

module.exports = router;
