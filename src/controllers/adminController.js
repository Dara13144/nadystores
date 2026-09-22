const fs = require('fs');
const path = require('path');
const adminService = require('../services/adminService');
const stockService = require('../services/stockService');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function getDashboard(req, res, next) {
  try {
    const stats = adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// Media Upload (Video & Images)
function uploadMedia(req, res, next) {
  try {
    const { data, filename, type } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Media data is required' });
    }

    let base64Content = data;
    let ext = type === 'video' ? '.mp4' : '.png';
    if (data.includes(';base64,')) {
      const parts = data.split(';base64,');
      const mime = parts[0].split(':')[1];
      base64Content = parts[1];
      if (mime.includes('webm')) ext = '.webm';
      else if (mime.includes('ogg')) ext = '.ogg';
      else if (mime.includes('quicktime') || mime.includes('mov')) ext = '.mov';
      else if (mime.includes('png')) ext = '.png';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
      else if (mime.includes('webp')) ext = '.webp';
    }

    const safeName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

    const fileUrl = `/uploads/${safeName}`;
    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully!',
      data: {
        url: fileUrl,
        filename: safeName,
        type: type || 'video'
      }
    });
  } catch (err) {
    next(err);
  }
}

// Products
function createProduct(req, res, next) {
  try {
    const product = adminService.createProduct(req.body, req.user);
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (err) {
    next(err);
  }
}

function updateProduct(req, res, next) {
  try {
    const product = adminService.updateProduct(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (err) {
    next(err);
  }
}

function deleteProduct(req, res, next) {
  try {
    const deleted = adminService.deleteProduct(req.params.id, req.user);
    res.json({ success: true, message: 'Product deleted', data: deleted });
  } catch (err) {
    next(err);
  }
}

// Stock
function getStock(req, res, next) {
  try {
    const result = adminService.getStockList(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

function bulkImport(req, res, next) {
  try {
    const { productId, rawText, type } = req.body;
    const result = stockService.bulkImportStock({ productId, rawText, type });
    adminService.logAuditAction({
      adminId: req.user.id,
      adminName: req.user.fullName,
      action: 'BULK_IMPORT_STOCK',
      targetType: 'STOCK',
      targetId: productId,
      details: { importedCount: result.importedCount }
    });
    res.json({
      success: true,
      message: `Successfully imported ${result.importedCount} stock items!`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function addStock(req, res, next) {
  try {
    const { productId, value, rawText, type } = req.body;
    if (rawText && rawText.trim()) {
      const result = stockService.bulkImportStock({ productId, rawText, type: type || 'Account' });
      adminService.logAuditAction({
        adminId: req.user.id,
        adminName: req.user.fullName,
        action: 'ADD_STOCK_BULK',
        targetType: 'STOCK',
        targetId: productId,
        details: { count: result.importedCount }
      });
      return res.status(201).json({
        success: true,
        message: `Successfully added ${result.importedCount} stock items!`,
        data: result
      });
    }

    if (!value || !value.trim()) {
      return res.status(400).json({ success: false, message: 'Stock value or credentials are required' });
    }

    const result = stockService.addSingleStock({ productId, value, type: type || 'Account' });
    adminService.logAuditAction({
      adminId: req.user.id,
      adminName: req.user.fullName,
      action: 'ADD_STOCK_SINGLE',
      targetType: 'STOCK',
      targetId: productId,
      details: { stockId: result.stockItem.id }
    });

    res.status(201).json({
      success: true,
      message: 'Stock item added successfully!',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function deleteStock(req, res, next) {
  try {
    const result = stockService.deleteStockItem(req.params.id);
    adminService.logAuditAction({
      adminId: req.user.id,
      adminName: req.user.fullName,
      action: 'DELETE_STOCK',
      targetType: 'STOCK',
      targetId: req.params.id,
      details: { deletedValue: result.deleted?.value }
    });
    res.json({
      success: true,
      message: 'Stock item removed successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

// Orders
function getOrders(req, res, next) {
  try {
    const result = adminService.getAllOrders(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function approveOrder(req, res, next) {
  try {
    const order = await adminService.manualApproveOrder(req.params.id, req.user);
    res.json({ success: true, message: 'Order manually approved and fulfilled', data: order });
  } catch (err) {
    next(err);
  }
}

function cancelOrder(req, res, next) {
  try {
    const order = adminService.cancelOrder(req.params.id, req.user, req.body.reason);
    res.json({ success: true, message: 'Order cancelled', data: order });
  } catch (err) {
    next(err);
  }
}

// Users
function getUsers(req, res, next) {
  try {
    const users = db.get('users').map(u => {
      const { password_hash, ...safe } = u;
      const wallet = db.find('wallets', w => w.user_id === u.id);
      return {
        ...safe,
        walletBalance: wallet ? wallet.balance : 0
      };
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

function updateUserRole(req, res, next) {
  try {
    const { role, status } = req.body;
    const updated = db.update('users', u => u.id === req.params.id, {
      ...(role && { role }),
      ...(status && { status })
    });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    const { password_hash, ...safe } = updated;
    res.json({ success: true, message: 'User updated', data: safe });
  } catch (err) {
    next(err);
  }
}

function adjustUserBalance(req, res, next) {
  try {
    const { amount, action, note } = req.body;
    const result = adminService.adjustUserBalance(req.params.id, { amount, action, note }, req.user);
    res.json({
      success: true,
      message: `User wallet balance updated to $${Number(result.wallet.balance).toFixed(2)}!`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

// Coupons
function getCoupons(req, res, next) {
  try {
    res.json({ success: true, data: db.get('coupons') });
  } catch (err) {
    next(err);
  }
}

function createCoupon(req, res, next) {
  try {
    const { code, type, value, minimumAmount, maximumDiscount, usageLimit, expiresAt } = req.body;
    const coupon = {
      id: uuidv4(),
      code: code.toUpperCase().trim(),
      type: type || 'percentage',
      value: Number(value),
      minimum_amount: Number(minimumAmount) || 0,
      maximum_discount: maximumDiscount ? Number(maximumDiscount) : null,
      usage_limit: usageLimit ? Number(usageLimit) : 100,
      used_count: 0,
      expires_at: expiresAt || null,
      active: true,
      created_at: new Date().toISOString()
    };
    db.insert('coupons', coupon);
    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (err) {
    next(err);
  }
}

// Wallet Transactions
function getWalletTransactions(req, res, next) {
  try {
    const list = adminService.getWalletTransactionsList(req.query);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

function approveWalletTopUp(req, res, next) {
  try {
    const result = adminService.approveWalletTopUp(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

function rejectWalletTopUp(req, res, next) {
  try {
    const result = adminService.rejectWalletTopUp(req.params.id, req.body.reason, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Security Operations & Audit
const { getSecurityStats, unblockIp, banIp } = require('../services/securityLogService');

function getSecurityOverview(req, res, next) {
  try {
    const stats = getSecurityStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

function getSecurityEvents(req, res, next) {
  try {
    const events = db.get('security_events');
    const { type, ip, search } = req.query;

    let filtered = events.slice();
    if (type) filtered = filtered.filter(e => e.event_type === type);
    if (ip) filtered = filtered.filter(e => e.ip_address === ip);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e =>
        (e.endpoint && e.endpoint.toLowerCase().includes(s)) ||
        (e.ip_address && e.ip_address.toLowerCase().includes(s)) ||
        (e.event_type && e.event_type.toLowerCase().includes(s)) ||
        (e.action && e.action.toLowerCase().includes(s))
      );
    }

    res.json({ success: true, data: filtered.reverse() });
  } catch (err) {
    next(err);
  }
}

function unblockIpAddress(req, res, next) {
  try {
    const { ipAddress } = req.body;
    if (!ipAddress) return res.status(400).json({ success: false, message: 'IP address is required' });

    const success = unblockIp(ipAddress, req.user?.username || 'Admin');
    if (!success) {
      return res.status(404).json({ success: false, message: 'Blocked IP record not found' });
    }

    res.json({ success: true, message: `IP ${ipAddress} has been unblocked successfully.` });
  } catch (err) {
    next(err);
  }
}

function banIpAddress(req, res, next) {
  try {
    const { ipAddress, reason, durationMinutes } = req.body;
    if (!ipAddress) return res.status(400).json({ success: false, message: 'IP address is required' });

    const result = banIp(ipAddress, reason || 'Manual admin block', durationMinutes || 60, 'Admin Action');
    res.json({ success: true, message: `IP ${ipAddress} has been blocked.`, data: result });
  } catch (err) {
    next(err);
  }
}

// Audit Logs
function getAuditLogs(req, res, next) {
  try {
    const logs = db.get('audit_logs').slice().reverse();
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  uploadMedia,
  createProduct,
  updateProduct,
  deleteProduct,
  getStock,
  bulkImport,
  addStock,
  deleteStock,
  getOrders,
  approveOrder,
  cancelOrder,
  getUsers,
  updateUserRole,
  adjustUserBalance,
  getWalletTransactions,
  approveWalletTopUp,
  rejectWalletTopUp,
  getCoupons,
  createCoupon,
  getAuditLogs,
  getSecurityOverview,
  getSecurityEvents,
  unblockIpAddress,
  banIpAddress
};
