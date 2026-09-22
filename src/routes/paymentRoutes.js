const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

const { paymentLimiter } = require('../middleware/rateLimitMiddleware');

// CutLuy & KHQR Webhook callback
router.post('/cutluy/webhook', orderController.handleCutLuyWebhook);

// ABA PayWay webhook callback
router.post('/aba/callback', orderController.handleABACallback);

// Live CutLuy / KHQR payment status check (unthrottled for 1s real-time auto checking)
router.get('/cutluy/status/:orderId', orderController.checkBakongStatus);
router.get('/bakong/status/:orderId', orderController.checkBakongStatus);
router.get('/status/:orderId', orderController.checkBakongStatus);

module.exports = router;


