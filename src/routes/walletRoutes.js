const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimitMiddleware');

router.get('/info', authMiddleware, walletController.getWalletInfo);
router.post('/topup', authMiddleware, paymentLimiter, walletController.topUpWallet);
router.post('/create-topup', authMiddleware, paymentLimiter, walletController.createTopUpPayment);
router.get('/status/:reference', authMiddleware, walletController.checkTopUpStatus);

module.exports = router;
