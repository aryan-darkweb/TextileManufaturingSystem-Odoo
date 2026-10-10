const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/apiResponse');

async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary();
    return success(res, summary, 'Dashboard overview metrics retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary
};
