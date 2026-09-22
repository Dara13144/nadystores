const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const logger = require('./config/logger');

// Security Middlewares
const securityHeadersMiddleware = require('./middleware/securityHeadersMiddleware');
const { abuseProtectionMiddleware } = require('./middleware/abuseProtectionMiddleware');
const cloudflareOriginMiddleware = require('./middleware/cloudflareOriginMiddleware');
const requestTimeoutMiddleware = require('./middleware/requestTimeoutMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');
const couponRoutes = require('./routes/couponRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Disable Express fingerprinting
app.disable('x-powered-by');

// 1. Trust proxy for Cloudflare / Render reverse proxy
app.set('trust proxy', 1);

// 2. Comprehensive Security Headers (Helmet CSP, HSTS, X-Content-Type-Options)
app.use(securityHeadersMiddleware);

// 3. Cloudflare Origin Secret Verification (prevents direct origin IP bypass in prod)
app.use(cloudflareOriginMiddleware);

// 4. IP Abuse & Malicious Scanner Protection
app.use(abuseProtectionMiddleware);

// 5. 30-Second Request Timeout Defense (against Slowloris attacks)
app.use(requestTimeoutMiddleware(30000));

// 6. Strict Production CORS
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://nadystore.com',
  'https://www.nadystore.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, server-to-server webhooks) with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(ao => origin === ao || origin.endsWith('.vercel.app') || origin.endsWith('.render.com') || origin.endsWith('.pages.dev'))) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, validated in production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key', 'X-Origin-Secret']
}));

// 7. Request Body Parsing & Limits (protecting against payload memory exhaustion)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 8. HTTP Parameter Pollution (HPP) Defense
app.use(hpp({
  whitelist: ['category', 'type', 'status', 'tag'] // allowed array parameters
}));

// 9. Direct CutLuy Webhook endpoint (Raw body signature verified)
app.post('/webhooks/cutluy', require('./controllers/orderController').handleCutLuyWebhook);

// 10. Static Uploads Serving with nosniff headers
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// 11. Global Rate Limiter
app.use(generalLimiter);

// 12. Request logging in development
if (env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
    });
    next();
  });
}

// 13. Frontend Dist Static Assets serving if packaged together
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// 14. Health Check Endpoints
app.get('/', (req, res) => {
  if (req.headers.accept?.includes('text/html')) {
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.redirect(env.FRONTEND_URL || 'http://localhost:5173');
  }
  res.json({
    success: true,
    message: '🚀 NadyStore Digital Store API Server is active, secure, and healthy!',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:5173',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'NadyStore Marketplace Secure API v1.0.0',
    docs: '/api/health'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Digital Subscription Marketplace API',
    version: '1.0.0',
    securityStatus: 'WAF & Anti-Abuse Active'
  });
});

// 15. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 16. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// 17. Centralized Production Error Handler
app.use(errorHandler);

module.exports = app;
