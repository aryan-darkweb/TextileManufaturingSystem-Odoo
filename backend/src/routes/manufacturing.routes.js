const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturing.controller');
const { validateBody } = require('../middleware/validate');

function validateCreateOrder(body) {
  if (!body.productId || typeof body.productId !== 'string') {
    return 'productId is required';
  }
  if (body.targetQuantity === undefined || Number(body.targetQuantity) <= 0) {
    return 'targetQuantity must be a number greater than zero';
  }
  if (body.materials && Array.isArray(body.materials)) {
    for (const m of body.materials) {
      if (!m.rawMaterialId) return 'Each material item requires rawMaterialId';
      if (!m.plannedQuantity || Number(m.plannedQuantity) <= 0) {
        return 'Each material item requires plannedQuantity > 0';
      }
    }
  }
  return null;
}

function validateStartStage(body) {
  // machineId and operatorId are optional in body
  return null;
}

function validateCompleteStage(body) {
  if (body.outputQuantity === undefined || Number(body.outputQuantity) <= 0) {
    return 'outputQuantity must be a number greater than zero';
  }
  if (body.wasteQuantity !== undefined && Number(body.wasteQuantity) < 0) {
    return 'wasteQuantity cannot be negative';
  }
  return null;
}

function validateUpdateStatus(body) {
  if (!body.status || (body.status !== 'PAUSED' && body.status !== 'IN_PROGRESS')) {
    return 'status must be either PAUSED or IN_PROGRESS';
  }
  return null;
}

function validateMachineStatus(body) {
  const allowed = ['IDLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN'];
  if (!body.status || !allowed.includes(body.status)) {
    return `status must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

// Executive overview & integration
router.get('/factory-today', manufacturingController.getFactoryToday);
router.get('/status/by-sales-order/:salesOrderId', manufacturingController.getStatusBySalesOrder);
router.get('/materials/requirement-vs-available/:productionOrderId', manufacturingController.getMaterialRequirements);
router.get('/materials/shortages', manufacturingController.getAllMaterialShortages);

// Production Order CRUD & lifecycle
router.get('/orders', manufacturingController.getProductionOrders);
router.post('/orders', validateBody(validateCreateOrder), manufacturingController.createProductionOrder);
router.get('/orders/:id', manufacturingController.getProductionOrderById);
router.get('/orders/:id/trace', manufacturingController.getOrderTrace);
router.patch('/orders/:id/status', validateBody(validateUpdateStatus), manufacturingController.updateOrderStatus);

// Stage execution
router.post('/orders/:id/stages/start', validateBody(validateStartStage), manufacturingController.startStage);
router.post('/orders/:id/stages/complete', validateBody(validateCompleteStage), manufacturingController.completeStage);

// Machines & Daily Output
router.get('/machines/daily-output', manufacturingController.getMachineDailyOutput);
router.get('/machines', manufacturingController.getMachines);
router.patch('/machines/:id/status', validateBody(validateMachineStatus), manufacturingController.updateMachineStatus);


module.exports = router;
