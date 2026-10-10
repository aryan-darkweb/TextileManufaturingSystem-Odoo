const inventoryService = require('../services/inventory.service');
const { success } = require('../utils/apiResponse');

async function getProducts(req, res, next) {
  try {
    const products = await inventoryService.listProducts(req.query);
    return success(res, products, 'Products retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await inventoryService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, product, 'Product details retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const newProduct = await inventoryService.createProduct(req.body);
    return success(res, newProduct, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function createTransaction(req, res, next) {
  try {
    const result = await inventoryService.recordTransaction(req.body);
    return success(res, result, 'Inventory transaction recorded successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getLowStock(req, res, next) {
  try {
    const alerts = await inventoryService.getLowStockAlerts();
    return success(res, alerts, 'Low stock alerts retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  createTransaction,
  getLowStock
};
