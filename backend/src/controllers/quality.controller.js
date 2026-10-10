const qualityService = require('../services/quality.service');
const { success } = require('../utils/apiResponse');

async function getInspections(req, res, next) {
  try {
    const inspections = await qualityService.listInspections();
    return success(res, inspections, 'Quality inspections retrieved (Teammate Factory Ops)');
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await qualityService.getModuleStatus();
    return success(res, status, 'Quality integration status');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInspections,
  getStatus
};
