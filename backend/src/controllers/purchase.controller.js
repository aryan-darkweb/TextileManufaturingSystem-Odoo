const purchaseService = require('../services/purchase.service');
const { success } = require('../utils/apiResponse');

async function getSuppliers(req, res, next) {
  try {
    const suppliers = await purchaseService.listSuppliers();
    return success(res, suppliers, 'Suppliers retrieved');
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await purchaseService.createSupplier(req.body);
    return success(res, supplier, 'Supplier created', 201);
  } catch (err) {
    next(err);
  }
}

async function getPurchaseOrders(req, res, next) {
  try {
    const orders = await purchaseService.listPurchaseOrders();
    return success(res, orders, 'Purchase orders retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuppliers,
  createSupplier,
  getPurchaseOrders
};
