function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

function error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  if (details) {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  error
};
