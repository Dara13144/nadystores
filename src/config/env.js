require('dotenv').config();
const { z } = require('zod');
const logger = require('./logger');

const envSchema = z.object({
  PORT: z.string().default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().default('digital_store_jwt_secret_dev_key_123'),
  JWT_REFRESH_SECRET: z.string().default('digital_store_jwt_refresh_dev_key_456'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_SECRET_KEY: z.string().optional().default(''),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_JWKS_URL: z.string().optional().default(''),
  SUPABASE_AUTH_CALLBACK_URL: z.string().optional().default('https://lbsehkzscunmqhxpdfqp.supabase.co/auth/v1/callback'),
  SUPABASE_STORAGE_BUCKET: z.string().default('digital-assets'),
  ABA_MERCHANT_ID: z.string().default('ec438992'),
  ABA_API_KEY: z.string().default('b1d2e3f4a5c6e7f8'),
  ABA_API_URL: z.string().default('https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase'),
  ABA_RETURN_URL: z.string().default('http://localhost:5173/order-success'),
  ABA_CANCEL_URL: z.string().default('http://localhost:5173/cart'),
  ABA_CALLBACK_URL: z.string().default('http://localhost:5000/api/payments/aba/callback'),
  BAKONG_API_URL: z.string().default('https://api-bakong.nbc.gov.kh/v1'),
  BAKONG_TOKEN: z.string().default('sandbox_token'),
  BAKONG_MERCHANT_ID: z.string().default('store@devb'),
  BAKONG_MERCHANT_NAME: z.string().default('DIGITAL STORE'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),
  CUTLUY_API_KEY: z.string().default('ck_live_46AmMZQzDN9iCnWm4ZZF-cYrtLVqM_eo'),
  CUTLUY_API_URL: z.string().default('https://cutluy.com/v1/payments'),
  CUTLUY_WEBHOOK_SECRET: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Environment validation error:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
