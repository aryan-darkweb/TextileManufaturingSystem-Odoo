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

function validateShortageOrderInput(body) {
  if (!body.supplierId || typeof body.supplierId !== 'string') {
    return 'supplierId is required and must be a string';
  }
  const matId = body.materialId || body.productId || body.rawMaterialId;
  if (!matId || typeof matId !== 'string') {
    return 'materialId is required and must be a string';
  }
  const qty = parseFloat(body.quantity || body.orderedQty);
  if (isNaN(qty) || qty <= 0) {
    return 'quantity must be a number greater than zero';
  }
  if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '') {
    const price = parseFloat(body.unitPrice);
    if (isNaN(price) || price < 0) {
      return 'unitPrice must be a valid non-negative number';
    }
  }
  return null;
}

router.get('/suppliers', purchaseController.getSuppliers);
router.post('/suppliers', purchaseController.createSupplier);
router.get('/orders', purchaseController.getPurchaseOrders);
router.post('/orders', validateBody(validateOrderInput), purchaseController.createPurchaseOrder);
router.post('/orders/from-shortage', validateBody(validateShortageOrderInput), purchaseController.createPurchaseOrderFromShortage);
router.get('/orders/:id', purchaseController.getPurchaseOrderById);
router.post('/orders/:id/receive', purchaseController.receiveGoods);

module.exports = router;

