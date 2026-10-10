const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');

router.get('/suppliers', purchaseController.getSuppliers);
router.post('/suppliers', purchaseController.createSupplier);
router.get('/orders', purchaseController.getPurchaseOrders);

module.exports = router;
