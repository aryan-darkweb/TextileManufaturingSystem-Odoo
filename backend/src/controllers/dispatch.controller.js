const dispatchService = require('../services/dispatch.service');
const { success } = require('../utils/apiResponse');

async function getDispatches(req, res, next) {
  try {
    const dispatches = await dispatchService.listDispatchRecords(req.query);
    return success(res, dispatches, 'Dispatch records retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getEligibleOrders(req, res, next) {
  try {
    const orders = await dispatchService.getEligibleSalesOrders();
    return success(res, orders, 'Eligible sales orders for dispatch retrieved');
  } catch (err) {
    next(err);
  }
}

async function createDispatch(req, res, next) {
  try {
    const dispatch = await dispatchService.createAndConfirmDispatch(req.body);
    return success(res, dispatch, 'Dispatch confirmed, inventory stock deducted, and order status updated', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDispatches,
  getEligibleOrders,
  createDispatch
};
