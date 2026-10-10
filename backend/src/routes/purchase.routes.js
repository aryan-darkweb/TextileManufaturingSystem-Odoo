const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { validateBody } = require('../middleware/validate');

function validateOrderInput(body) {
  if (!body.supplierId && !body.supplierName) {
    return 'Either supplierId or supplierName is required';
  }
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return 'At least one line item is required in the purchase order';
  }
  return null;
}

router.get('/suppliers', purchaseController.getSuppliers);
router.post('/suppliers', purchaseController.createSupplier);
router.get('/orders', purchaseController.getPurchaseOrders);
router.post('/orders', validateBody(validateOrderInput), purchaseController.createPurchaseOrder);
router.get('/orders/:id', purchaseController.getPurchaseOrderById);
router.post('/orders/:id/receive', purchaseController.receiveGoods);

module.exports = router;
