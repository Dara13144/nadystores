const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { adminLimiter } = require('../middleware/rateLimitMiddleware');

// All admin routes require admin authentication & strict admin rate limiting
router.use(adminLimiter, authMiddleware, requireRole('admin', 'superadmin'));

// Dashboard stats
router.get('/dashboard', adminController.getDashboard);

// Media Upload (Video & Images)
router.post('/upload-media', adminController.uploadMedia);

// Products
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Stock
router.get('/stock', adminController.getStock);
router.post('/stock', adminController.addStock);
router.post('/stock/bulk-import', adminController.bulkImport);
router.delete('/stock/:id', adminController.deleteStock);

// Orders
router.get('/orders', adminController.getOrders);
router.post('/orders/:id/approve', adminController.approveOrder);
router.post('/orders/:id/cancel', adminController.cancelOrder);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/balance', adminController.adjustUserBalance);

// Wallet Transactions
router.get('/wallet-transactions', adminController.getWalletTransactions);
router.post('/wallet-transactions/:id/approve', adminController.approveWalletTopUp);
router.post('/wallet-transactions/:id/reject', adminController.rejectWalletTopUp);

// Coupons
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);

// Security Operations & Audit Center
router.get('/security/overview', adminController.getSecurityOverview);
router.get('/security/events', adminController.getSecurityEvents);
router.post('/security/unblock-ip', adminController.unblockIpAddress);
router.post('/security/ban-ip', adminController.banIpAddress);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
