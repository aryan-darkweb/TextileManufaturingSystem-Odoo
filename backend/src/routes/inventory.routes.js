const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { validateBody } = require('../middleware/validate');

function validateProductInput(body) {
  if (!body.code || typeof body.code !== 'string') return 'Product code is required';
  if (!body.name || typeof body.name !== 'string') return 'Product name is required';
  if (!body.type) return 'Product type (RAW_MATERIAL, FINISHED_GOODS, WIP, CONSUMABLE) is required';
  if (!body.category) return 'Category is required';
  if (!body.unit) return 'Unit of measure is required';
  return null;
}

function validateTransactionInput(body) {
  if (!body.productId) return 'Product ID is required';
  if (!body.type) return 'Transaction type is required';
  if (body.quantity === undefined || body.quantity === null) return 'Quantity is required';
  return null;
}

router.get('/products', inventoryController.getProducts);
router.post('/products', validateBody(validateProductInput), inventoryController.createProduct);
router.get('/products/:id', inventoryController.getProductById);
router.get('/low-stock', inventoryController.getLowStock);
router.post('/transactions', validateBody(validateTransactionInput), inventoryController.createTransaction);

module.exports = router;
