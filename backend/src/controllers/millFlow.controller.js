const millFlowService = require('../services/millFlow.service');

async function getMillPipeline(req, res, next) {
  try {
    const data = await millFlowService.getMillPipeline(req.query);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createBuyerOrderWithYarnCheck(req, res, next) {
  try {
    const data = await millFlowService.createBuyerOrderWithYarnCheck(req.body);
    res.status(201).json({
      success: true,
      message: 'Buyer order created and Yarn BOM requirement calculated',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function orderYarnFromSupplier(req, res, next) {
  try {
    const data = await millFlowService.orderYarnFromSupplier(req.body);
    res.status(201).json({
      success: true,
      message: 'Yarn successfully ordered and received into inventory',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function startProductionAndDeductYarn(req, res, next) {
  try {
    const data = await millFlowService.startProductionAndDeductYarn(req.body);
    res.status(201).json({
      success: true,
      message: 'Production started and raw yarn deducted from inventory',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function recordQualityInspection(req, res, next) {
  try {
    const data = await millFlowService.recordQualityInspection(req.body);
    res.status(200).json({
      success: true,
      message: data.outcome === 'GOOD'
        ? 'Quality passed! Fabric approved for dispatch.'
        : 'Quality rejected. Fabric marked defective. Wasted yarn recorded.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function dispatchFabricToBuyer(req, res, next) {
  try {
    const data = await millFlowService.dispatchFabricToBuyer(req.body);
    res.status(200).json({
      success: true,
      message: 'Fabric dispatched and delivered to buyer! Revenue recognized.',
      data
    });
  } catch (err) {
    next(err);
  }
}

async function getOwnerMonthlyFinancials(req, res, next) {
  try {
    const data = await millFlowService.getOwnerMonthlyFinancials(req.query);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function getStageMachines(req, res, next) {
  try {
    const data = await millFlowService.getStageMachines();
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function updateMachineStatus(req, res, next) {
  try {
    const data = await millFlowService.updateMachineStatus(req.params.id, req.body.status);
    res.json({
      success: true,
      message: `Machine status updated to ${data.status}`,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function advanceProductionStage(req, res, next) {
  try {
    const data = await millFlowService.advanceProductionStage(req.params.id, req.body);
    res.json({
      success: true,
      message: data.message,
      data
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMillPipeline,
  createBuyerOrderWithYarnCheck,
  orderYarnFromSupplier,
  startProductionAndDeductYarn,
  recordQualityInspection,
  dispatchFabricToBuyer,
  getOwnerMonthlyFinancials,
  getStageMachines,
  updateMachineStatus,
  advanceProductionStage
};
