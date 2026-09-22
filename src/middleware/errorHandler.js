const logger = require('../config/logger');
const { logSecurityEvent } = require('../services/securityLogService');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log internal server errors securely
  logger.error('API Error:', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method,
    statusCode
  });

  // If unauthorized, forbidden, or attack-related, log to security events
  if ([401, 403, 429].includes(statusCode)) {
    logSecurityEvent({
      ipAddress: req.clientIp || req.ip || '127.0.0.1',
      userId: req.user?.id || null,
      eventType: statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : statusCode === 403 ? 'FORBIDDEN_ACCESS' : 'RATE_LIMIT_HIT',
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'] || '',
      statusCode,
      action: err.message
    });
  }

  // Safe client response
  const response = {
    success: false,
    error: err.code || (statusCode === 429 ? 'TOO_MANY_REQUESTS' : statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
    message: isProduction && statusCode >= 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error'
  };

  if (!isProduction) {
    if (err.stack) response.stack = err.stack;
    if (err.details) response.details = err.details;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
