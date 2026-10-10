const purchaseService = require('../services/purchase.service');
const { success } = require('../utils/apiResponse');

async function getSuppliers(req, res, next) {
  try {
    const suppliers = await purchaseService.listSuppliers();
    return success(res, suppliers, 'Suppliers retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await purchaseService.createSupplier(req.body);
    return success(res, supplier, 'Supplier created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getPurchaseOrders(req, res, next) {
  try {
    const orders = await purchaseService.listPurchaseOrders(req.query);
    return success(res, orders, 'Purchase orders retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getPurchaseOrderById(req, res, next) {
  try {
    const order = await purchaseService.getPurchaseOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, order, 'Purchase order details retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createPurchaseOrder(req, res, next) {
  try {
    const order = await purchaseService.createPurchaseOrder(req.body);
    return success(res, order, 'Purchase order created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function receiveGoods(req, res, next) {
  try {
    const updatedOrder = await purchaseService.receiveGoods(req.params.id, req.body);
    return success(res, updatedOrder, 'Goods received and inventory stock updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receiveGoods
};
