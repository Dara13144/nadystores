const env = require('../config/env');
const logger = require('../config/logger');
const { logSecurityEvent } = require('../services/securityLogService');

/**
 * Validates that requests in production are routed through Cloudflare
 * and cannot bypass the edge firewall directly.
 */
function cloudflareOriginMiddleware(req, res, next) {
  // Only enforce strict origin check if configured and in production
  const originSecret = process.env.SECURITY_SECRET || process.env.CLOUDFLARE_ORIGIN_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction || !originSecret) {
    return next();
  }

  const incomingSecret = req.headers['x-origin-secret'] || req.headers['x-custom-origin-auth'];
  const cfRay = req.headers['cf-ray'];

  if (incomingSecret !== originSecret && !cfRay) {
    logSecurityEvent({
      ipAddress: req.ip,
      eventType: 'ORIGIN_BYPASS_ATTEMPT',
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'] || '',
      statusCode: 403,
      action: 'BLOCKED_DIRECT_ORIGIN_ACCESS'
    });

    return res.status(403).json({
      success: false,
      error: 'DIRECT_ACCESS_FORBIDDEN',
      message: 'Direct origin server access is not permitted.'
    });
  }

  next();
}

module.exports = cloudflareOriginMiddleware;
