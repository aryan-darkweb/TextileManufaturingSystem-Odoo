const express = require('express');
const router = express.Router();
const qualityController = require('../controllers/quality.controller');
const { validateBody } = require('../middleware/validate');

function validateCreateInspection(body) {
  if (!body.productionOrderId || typeof body.productionOrderId !== 'string') {
    return 'productionOrderId is required';
  }
  if (!body.rollNumber || typeof body.rollNumber !== 'string') {
    return 'rollNumber is required';
  }
  if (body.metersInspected === undefined || Number(body.metersInspected) <= 0) {
    return 'metersInspected must be a positive number';
  }
  const validStatuses = ['PASSED', 'REWORK', 'REJECTED'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return `status must be one of: ${validStatuses.join(', ')}`;
  }
  return null;
}

function validateUpdateInspection(body) {
  if (!body.status || (body.status !== 'PASSED' && body.status !== 'REJECTED')) {
    return 'status must be either PASSED or REJECTED for re-inspection';
  }
  return null;
}

// Integration & Metrics
router.get('/dispatch-ready/by-sales-order/:salesOrderId', qualityController.getDispatchReadyBySalesOrder);
router.get('/dispatch-ready/:productionOrderId', qualityController.getDispatchReadyByProductionOrder);
router.get('/defect-rate/:productionOrderId', qualityController.getDefectRate);

// Roll Inspections CRUD
router.get('/inspections', qualityController.listInspections);
router.post('/inspections', validateBody(validateCreateInspection), qualityController.createInspection);
router.patch('/inspections/:id', validateBody(validateUpdateInspection), qualityController.updateInspection);

module.exports = router;
