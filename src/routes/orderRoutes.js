const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const downloadController = require('../controllers/downloadController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { paymentLimiter } = require('../middleware/rateLimitMiddleware');
const { createOrderSchema, confirmPaymentSchema } = require('../validators/orderValidators');

router.post('/', paymentLimiter, authMiddleware, validate(createOrderSchema), orderController.createOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);
router.get('/:id', optionalAuth, orderController.getOrder);
router.post('/:id/confirm-payment', paymentLimiter, validate(confirmPaymentSchema), orderController.confirmPayment);

// Download secure endpoints
router.get('/:id/download/:fileId', authMiddleware, downloadController.getDownloadLink);
router.get('/:id/download-stream/:fileId', downloadController.streamDownload);

module.exports = router;
