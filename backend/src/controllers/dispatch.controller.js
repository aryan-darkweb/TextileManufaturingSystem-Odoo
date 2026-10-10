const dispatchService = require('../services/dispatch.service');
const { success } = require('../utils/apiResponse');

async function getDispatches(req, res, next) {
  try {
    const dispatches = await dispatchService.listDispatchRecords();
    return success(res, dispatches, 'Dispatch records retrieved');
  } catch (err) {
    next(err);
  }
}

async function createDispatch(req, res, next) {
  try {
    const dispatch = await dispatchService.createDispatchRecord(req.body);
    return success(res, dispatch, 'Dispatch record created', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDispatches,
  createDispatch
};
