const helmet = require('helmet');

/**
 * Enterprise-grade Security Headers Middleware
 */
const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for Vite development & React inline scripts
        "'unsafe-eval'",
        'https://accounts.google.com',
        'https://apis.google.com',
        'https://challenges.cloudflare.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Tailwind & Google Fonts inline style injections
        'https://fonts.googleapis.com',
        'https://challenges.cloudflare.com'
      ],
      fontSrc: [
        "'self'",
        'data:',
        'https://fonts.gstatic.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http:',
        'https://images.unsplash.com',
        'https://api.dicebear.com',
        'https://cutluy.com',
        'https://*.googleusercontent.com'
      ],
      connectSrc: [
        "'self'",
        'http://localhost:*',
        'https://localhost:*',
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://accounts.google.com',
        'https://cutluy.com',
        'https://challenges.cloudflare.com'
      ],
      frameSrc: [
        "'self'",
        'https://accounts.google.com',
        'https://challenges.cloudflare.com'
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Prevent asset blocking across CDNs
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

module.exports = securityHeadersMiddleware;
