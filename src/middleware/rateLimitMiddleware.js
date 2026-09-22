const rateLimit = require('express-rate-limit');
const { logSecurityEvent, recordViolation } = require('../services/securityLogService');
const { getClientIp } = require('./abuseProtectionMiddleware');
const env = require('../config/env');

function isLocalhost(req) {
  const ip = getClientIp(req);
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
}

/**
 * Standard HTTP 429 Rate Limit Handler conforming to requirements
 */
function createRateLimitHandler(limiterType) {
  return (req, res, next, options) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    logSecurityEvent({
      ipAddress: clientIp,
      eventType: 'RATE_LIMIT_EXCEEDED',
      endpoint: req.originalUrl,
      method: req.method,
      userAgent,
      statusCode: 429,
      action: `RATE_LIMIT_${limiterType.toUpperCase()}`,
      metadata: { limiterType }
    });

    recordViolation(clientIp, `RATE_LIMIT_${limiterType.toUpperCase()}`, userAgent, req.originalUrl);

    res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.'
    });
  };
}

// 1. General API Rate Limiter (generous for standard page loading & AJAX polling)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 600, // 600 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalhost(req) && env.NODE_ENV === 'development',
  keyGenerator: (req) => getClientIp(req),
  handler: createRateLimitHandler('general')
});

// 2. Strict Login Limiter (Protect against credential stuffing & brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? req.body.email.toLowerCase().trim() : '';
    return `${getClientIp(req)}_${email}`;
  },
  handler: createRateLimitHandler('login')
});

// 3. Register Limiter (Prevent account spam creation)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Max 30 accounts created per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalhost(req) && env.NODE_ENV === 'development',
  keyGenerator: (req) => getClientIp(req),
  handler: createRateLimitHandler('register')
});

// 4. OTP / Verification Limiter
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Max 15 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const target = req.body?.email || req.body?.phone || '';
    return `${getClientIp(req)}_${target}`;
  },
  handler: createRateLimitHandler('otp')
});

// 5. Password Reset Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 reset requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? req.body.email.toLowerCase().trim() : '';
    return `${getClientIp(req)}_${email}`;
  },
  handler: createRateLimitHandler('password_reset')
});

// 6. Payment & Checkout Limiter
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 payment/checkout operations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${getClientIp(req)}_${req.user?.id || 'guest'}`,
  handler: createRateLimitHandler('payment')
});

// 7. Admin Endpoint Limiter
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // 500 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalhost(req) && env.NODE_ENV === 'development',
  keyGenerator: (req) => getClientIp(req),
  handler: createRateLimitHandler('admin')
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
  paymentLimiter,
  adminLimiter
};
