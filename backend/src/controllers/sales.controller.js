const salesService = require('../services/sales.service');
const { success } = require('../utils/apiResponse');

async function getSalesOrders(req, res, next) {
  try {
    const orders = await salesService.listSalesOrders(req.query);
    return success(res, orders, 'Sales orders retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getSalesOrderById(req, res, next) {
  try {
    const order = await salesService.getSalesOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, order, 'Sales order retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createSalesOrder(req, res, next) {
  try {
    const newOrder = await salesService.createSalesOrder(req.body);
    return success(res, newOrder, 'Sales order created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    const updated = await salesService.updateOrderStatus(req.params.id, status);
    return success(res, updated, 'Order status updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getCustomers(req, res, next) {
  try {
    const customers = await salesService.listCustomers();
    return success(res, customers, 'Customers retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createCustomer(req, res, next) {
  try {
    const newCustomer = await salesService.createCustomer(req.body);
    return success(res, newCustomer, 'Customer created successfully', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateStatus,
  getCustomers,
  createCustomer
};
