const manufacturingService = require('../services/manufacturing.service');
const { success } = require('../utils/apiResponse');

async function createProductionOrder(req, res, next) {
  try {
    const order = await manufacturingService.createProductionOrder(req.body);
    return success(res, order, 'Production order created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getProductionOrders(req, res, next) {
  try {
    const orders = await manufacturingService.listProductionOrders(req.query);
    return success(res, orders, 'Production orders retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getProductionOrderById(req, res, next) {
  try {
    const order = await manufacturingService.getProductionOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Production order not found',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, order, 'Production order details retrieved');
  } catch (err) {
    next(err);
  }
}

async function getOrderTrace(req, res, next) {
  try {
    const trace = await manufacturingService.getOrderTrace(req.params.id);
    if (!trace) {
      return res.status(404).json({
        success: false,
        message: 'Production order not found for traceability',
        timestamp: new Date().toISOString()
      });
    }
    return success(res, trace, 'Order traceability retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function startStage(req, res, next) {
  try {
    const stageLog = await manufacturingService.startStage(req.params.id, req.body);
    return success(res, stageLog, 'Production stage started successfully');
  } catch (err) {
    next(err);
  }
}

async function completeStage(req, res, next) {
  try {
    const updatedOrder = await manufacturingService.completeStage(req.params.id, req.body);
    return success(res, updatedOrder, 'Production stage completed successfully');
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const updated = await manufacturingService.updateOrderStatus(req.params.id, req.body.status);
    return success(res, updated, 'Order status updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getStatusBySalesOrder(req, res, next) {
  try {
    const status = await manufacturingService.getStatusBySalesOrder(req.params.salesOrderId);
    return success(res, status, 'Sales order production status retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMaterialRequirements(req, res, next) {
  try {
    const reqs = await manufacturingService.getMaterialRequirementVsAvailable(req.params.productionOrderId);
    return success(res, reqs, 'Material requirements vs availability retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMachines(req, res, next) {
  try {
    const machines = await manufacturingService.listMachines();
    return success(res, machines, 'Machines retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function updateMachineStatus(req, res, next) {
  try {
    const updated = await manufacturingService.updateMachineStatus(req.params.id, req.body.status);
    return success(res, updated, 'Machine status updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getFactoryToday(req, res, next) {
  try {
    const summary = await manufacturingService.getFactoryToday();
    return success(res, summary, 'Factory Today summary retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMachineDailyOutput(req, res, next) {
  try {
    const report = await manufacturingService.getMachineDailyOutput(req.query);
    return success(res, report, 'Machine daily output report retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getAllMaterialShortages(req, res, next) {
  try {
    const shortages = await manufacturingService.getAllMaterialShortages(req.query);
    return success(res, shortages, 'Material shortages retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProductionOrder,
  getProductionOrders,
  getProductionOrderById,
  getOrderTrace,
  startStage,
  completeStage,
  updateOrderStatus,
  getStatusBySalesOrder,
  getMaterialRequirements,
  getMachines,
  updateMachineStatus,
  getFactoryToday,
  getMachineDailyOutput,
  getAllMaterialShortages
};

