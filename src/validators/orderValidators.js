const { z } = require('zod');

const createOrderSchema = z.object({
  customerEmail: z.string().email('Valid email is required to receive digital delivery'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be at least 1')
  })).min(1, 'Order must contain at least 1 item'),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['aba_payway', 'bakong_khqr', 'wallet', 'simulated'], {
    errorMap: () => ({ message: 'Payment method must be aba_payway, bakong_khqr, wallet, or simulated' })
  })
});

const confirmPaymentSchema = z.object({
  transactionId: z.string().optional(),
  providerPayload: z.record(z.any()).optional()
});

module.exports = {
  createOrderSchema,
  confirmPaymentSchema
};
