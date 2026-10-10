const logger = require('../utils/logger');
const { error } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.url} - ${err.message}`, err.stack);

  // Prisma known errors
  if (err.code === 'P2002') {
    return error(res, 'A record with this unique value already exists.', 409, {
      field: err.meta?.target
    });
  }

  if (err.code === 'P2025') {
    return error(res, 'Requested resource was not found.', 404);
  }

  // Handle generic error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return error(res, message, statusCode);
}

module.exports = errorHandler;
