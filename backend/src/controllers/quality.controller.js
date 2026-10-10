const qualityService = require('../services/quality.service');
const { success } = require('../utils/apiResponse');

async function listInspections(req, res, next) {
  try {
    const inspections = await qualityService.listInspections(req.query);
    return success(res, inspections, 'Quality inspections retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createInspection(req, res, next) {
  try {
    const inspection = await qualityService.createInspection(req.body);
    return success(res, inspection, 'Quality inspection recorded successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateInspection(req, res, next) {
  try {
    const updated = await qualityService.updateInspection(req.params.id, req.body);
    return success(res, updated, 'Quality inspection re-inspection updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getDispatchReadyBySalesOrder(req, res, next) {
  try {
    const data = await qualityService.getDispatchReadyBySalesOrder(req.params.salesOrderId);
    return success(res, data, 'Sales order dispatch-ready quantity retrieved');
  } catch (err) {
    next(err);
  }
}

async function getDispatchReadyByProductionOrder(req, res, next) {
  try {
    const data = await qualityService.getDispatchReadyByProductionOrder(req.params.productionOrderId);
    return success(res, data, 'Production order dispatch-ready quantity retrieved');
  } catch (err) {
    next(err);
  }
}

async function getDefectRate(req, res, next) {
  try {
    const rate = await qualityService.getDefectRate(
      req.params.productionOrderId,
      req.query.productId
    );
    return success(res, rate, 'Defect rate analytics retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInspections,
  createInspection,
  updateInspection,
  getDispatchReadyBySalesOrder,
  getDispatchReadyByProductionOrder,
  getDefectRate
};
