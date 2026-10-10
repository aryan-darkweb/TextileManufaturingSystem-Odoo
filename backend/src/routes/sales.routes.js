const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const { validateBody } = require('../middleware/validate');

function validateOrderInput(body) {
  if (!body.customerId && !body.customerName) {
    return 'Either customerId or customerName is required';
  }
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return 'At least one item is required in the sales order';
  }
  for (const item of body.items) {
    if (!item.productId) return 'Each line item requires a productId';
    if (!item.quantity || Number(item.quantity) <= 0) return 'Each line item requires a valid quantity > 0';
    if (item.unitPrice === undefined || Number(item.unitPrice) < 0) return 'Each line item requires a valid unitPrice';
  }
  return null;
}

function validateCustomerInput(body) {
  if (!body.name || typeof body.name !== 'string') return 'Customer name is required';
  return null;
}

router.get('/orders', salesController.getSalesOrders);
router.post('/orders', validateBody(validateOrderInput), salesController.createSalesOrder);
router.get('/orders/:id', salesController.getSalesOrderById);
router.patch('/orders/:id/status', salesController.updateStatus);
router.get('/customers', salesController.getCustomers);
router.post('/customers', validateBody(validateCustomerInput), salesController.createCustomer);

module.exports = router;
