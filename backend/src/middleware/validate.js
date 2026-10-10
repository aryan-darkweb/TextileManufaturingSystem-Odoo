const { error } = require('../utils/apiResponse');

function validateBody(schemaCheck) {
  return (req, res, next) => {
    try {
      const validationError = schemaCheck(req.body);
      if (validationError) {
        return error(res, validationError, 400);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  validateBody
};
