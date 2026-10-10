const manufacturingService = require('../services/manufacturing.service');
const { success } = require('../utils/apiResponse');

async function getMachines(req, res, next) {
  try {
    const machines = await manufacturingService.listMachines();
    return success(res, machines, 'Machines retrieved (Teammate Factory Ops)');
  } catch (err) {
    next(err);
  }
}

async function getProductionOrders(req, res, next) {
  try {
    const orders = await manufacturingService.listProductionOrders();
    return success(res, orders, 'Production orders retrieved (Teammate Factory Ops)');
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await manufacturingService.getModuleStatus();
    return success(res, status, 'Manufacturing integration status');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMachines,
  getProductionOrders,
  getStatus
};
