const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
  phone: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required')
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema
};
