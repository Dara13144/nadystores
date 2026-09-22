const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const stockService = require('./stockService');
const walletService = require('./walletService');

function logAuditAction({ adminId, adminName, action, targetType, targetId, details, ip }) {
  db.insert('audit_logs', {
    id: uuidv4(),
    admin_id: adminId || null,
    admin_name: adminName || 'System Admin',
    action,
    target_type: targetType,
    target_id: targetId,
    details: details || {},
    ip_address: ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
}

function getDashboardStats() {
  const orders = db.get('orders');
  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const users = db.get('users');
  const products = db.get('products');
  const stock = db.get('digital_stock');
  const availableStock = stock.filter(s => s.status === 'available');

  // Wallet stats
  const wallets = db.get('wallets');
  const totalWalletsBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  const walletTransactions = db.get('wallet_transactions');
  const pendingTopUps = walletTransactions.filter(t => t.type === 'deposit' && t.status === 'pending');
  const completedTopUps = walletTransactions.filter(t => t.type === 'deposit' && (t.status === 'completed' || t.status === 'paid'));

  const enrichedWalletTx = walletTransactions.slice(-15).reverse().map(t => {
    const u = db.find('users', user => user.id === t.user_id);
    return {
      ...t,
      username: u ? u.username : 'Unknown',
      user_email: u ? u.email : 'Unknown'
    };
  });

  // Generate last 7 days revenue chart series
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = paidOrders.filter(o => o.created_at.slice(0, 10) === dateStr);
    const dayRev = dayOrders.reduce((sum, o) => sum + Number(o.total), 0);
    last7Days.push({
      date: dateStr,
      revenue: Number(dayRev.toFixed(2)),
      orders: dayOrders.length
    });
  }

  // Low stock products warning
  const lowStockProducts = products.map(p => {
    const pStock = stock.filter(s => s.product_id === p.id && s.status === 'available').length;
    return { id: p.id, name: p.name, stock_count: pStock };
  }).filter(p => p.stock_count <= 3);

  // All products inventory summary with stock details
  const inventory = products.map(p => {
    const pAvailable = stock.filter(s => s.product_id === p.id && s.status === 'available').length;
    const pSold = stock.filter(s => s.product_id === p.id && s.status === 'sold').length;
    const cat = db.find('categories', c => c.id === p.category_id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      category_name: cat ? cat.name : 'General',
      price: p.price,
      currency: p.currency || 'USD',
      delivery_type: p.delivery_type,
      product_type: p.product_type,
      available_stock: pAvailable,
      sold_stock: pSold,
      status: pAvailable === 0 ? 'out_of_stock' : pAvailable <= 3 ? 'low_stock' : 'in_stock'
    };
  });

  return {
    metrics: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      paidOrdersCount: paidOrders.length,
      totalUsers: users.length,
      totalProducts: products.length,
      availableStockCount: availableStock.length,
      lowStockCount: lowStockProducts.length,
      totalWalletsBalance: Number(totalWalletsBalance.toFixed(2)),
      pendingTopUpsCount: pendingTopUps.length,
      completedTopUpsCount: completedTopUps.length
    },
    revenueChart: last7Days,
    recentOrders: orders.slice(-10).reverse(),
    recentWalletTransactions: enrichedWalletTx,
    lowStockWarnings: lowStockProducts,
    inventory
  };
}

// Product Management
function createProduct(data, admin) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const product = {
    id: uuidv4(),
    name: data.name,
    slug,
    description: data.description,
    short_description: data.short_description || '',
    category_id: data.category_id,
    price: Number(data.price),
    compare_price: data.compare_price ? Number(data.compare_price) : null,
    currency: data.currency || 'USD',
    product_type: data.product_type || 'Subscription',
    delivery_type: data.delivery_type || 'Automatic',
    duration: data.duration || '1 Month',
    image: data.image,
    gallery: data.gallery || [data.image],
    stock_count: 0,
    status: data.status || 'active',
    featured: !!data.featured,
    popular: !!data.popular,
    is_digital: data.is_digital !== false,
    features: data.features || [],
    faq: data.faq || [],
    variants: Array.isArray(data.variants) ? data.variants : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('products', product);
  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName,
    action: 'CREATE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: product.id,
    details: { name: product.name }
  });

  return product;
}

function updateProduct(id, updates, admin) {
  const updated = db.update('products', p => p.id === id, updates);
  if (!updated) throw new Error('Product not found');

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName,
    action: 'UPDATE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: id,
    details: updates
  });

  return updated;
}

function deleteProduct(id, admin) {
  const deleted = db.remove('products', p => p.id === id);
  if (!deleted) throw new Error('Product not found');

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName,
    action: 'DELETE_PRODUCT',
    targetType: 'PRODUCT',
    targetId: id,
    details: { name: deleted.name }
  });

  return deleted;
}

// Stock Management
function getStockList({ productId, status, search, page = 1, limit = 50 }) {
  let list = db.get('digital_stock');

  if (productId && productId !== 'all') {
    list = list.filter(s => s.product_id === productId);
  }
  if (status && status !== 'all') {
    list = list.filter(s => s.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s => s.value.toLowerCase().includes(q));
  }

  // Enrich with product names
  const enriched = list.map(item => {
    const p = db.find('products', prod => prod.id === item.product_id);
    return {
      ...item,
      product_name: p ? p.name : 'Unknown Product'
    };
  }).reverse();

  const total = enriched.length;
  const startIndex = (page - 1) * limit;
  const paginated = enriched.slice(startIndex, startIndex + Number(limit));

  return {
    stock: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
}

// Order Management
function getAllOrders({ status, paymentStatus, search, page = 1, limit = 50 }) {
  let orders = db.get('orders').slice().reverse();

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  if (paymentStatus && paymentStatus !== 'all') {
    orders = orders.filter(o => o.payment_status === paymentStatus);
  }
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(o =>
      o.order_number.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q) ||
      (o.transaction_id && o.transaction_id.toLowerCase().includes(q))
    );
  }

  const total = orders.length;
  const startIndex = (Number(page) - 1) * Number(limit);
  const paginated = orders.slice(startIndex, startIndex + Number(limit)).map(order => {
    const items = db.filter('order_items', i => i.order_id === order.id);
    const enrichedItems = items.map(item => {
      let creds = [];
      try {
        const orderService = require('./orderService');
        creds = orderService.normalizeDeliveredCredentials(item, order);
      } catch (e) {
        creds = item.delivered_data || [];
      }
      return {
        ...item,
        delivered_data: creds,
        fulfilled_credentials: creds,
        credentials: creds
      };
    });
    return {
      ...order,
      item_count: items.reduce((sum, i) => sum + i.quantity, 0),
      items: enrichedItems
    };
  });

  return {
    orders: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
}

async function manualApproveOrder(orderId, admin) {
  const order = db.find('orders', o => o.id === orderId);
  if (!order) throw new Error('Order not found');

  db.update('orders', o => o.id === orderId, {
    payment_status: 'paid',
    status: 'processing',
    transaction_id: `MANUAL_ADMIN_${admin?.username || 'ADM'}_${Date.now()}`
  });

  // Allocate stock
  await stockService.allocateStockForOrder(orderId);

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName,
    action: 'MANUAL_APPROVE_ORDER',
    targetType: 'ORDER',
    targetId: orderId,
    details: { orderNumber: order.order_number }
  });

  return db.find('orders', o => o.id === orderId);
}

function cancelOrder(orderId, admin, reason = 'Cancelled by administrator') {
  const order = db.find('orders', o => o.id === orderId);
  if (!order) throw new Error('Order not found');

  db.update('orders', o => o.id === orderId, {
    status: 'cancelled',
    internal_notes: reason
  });

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName,
    action: 'CANCEL_ORDER',
    targetType: 'ORDER',
    targetId: orderId,
    details: { reason }
  });

  return db.find('orders', o => o.id === orderId);
}

function adjustUserBalance(userId, { amount, action = 'add', note = '' }, admin) {
  const user = db.find('users', u => u.id === userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    const err = new Error('Valid positive amount is required');
    err.statusCode = 400;
    throw err;
  }

  const walletService = require('./walletService');
  let { wallet } = walletService.getWallet(userId);
  let txResult;

  if (action === 'set') {
    const currentBal = Number(wallet.balance || 0);
    const diff = Number((numAmount - currentBal).toFixed(2));
    if (diff > 0) {
      txResult = walletService.deposit(
        userId,
        diff,
        `ADMIN-SET-${Date.now().toString().slice(-6)}`,
        note || `Admin balance set by ${admin?.username || 'Admin'} (to $${numAmount.toFixed(2)})`
      );
    } else if (diff < 0) {
      txResult = walletService.deduct(
        userId,
        Math.abs(diff),
        `ADMIN-SET-${Date.now().toString().slice(-6)}`,
        note || `Admin balance set by ${admin?.username || 'Admin'} (to $${numAmount.toFixed(2)})`
      );
    } else {
      txResult = { wallet, transaction: null };
    }
  } else if (action === 'deduct' || action === 'withdraw') {
    if (numAmount === 0) {
      const err = new Error('Amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }
    txResult = walletService.deduct(
      userId,
      numAmount,
      `ADMIN-DED-${Date.now().toString().slice(-6)}`,
      note || `Admin balance deducted by ${admin?.username || 'Admin'}`
    );
  } else {
    // Default: add / deposit
    if (numAmount === 0) {
      const err = new Error('Amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }
    txResult = walletService.deposit(
      userId,
      numAmount,
      `ADMIN-DEP-${Date.now().toString().slice(-6)}`,
      note || `Admin balance credited by ${admin?.username || 'Admin'}`
    );
  }

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName || admin?.username,
    action: 'ADJUST_WALLET_BALANCE',
    targetType: 'WALLET',
    targetId: userId,
    details: {
      action,
      amount: numAmount,
      previousBalance: txResult.transaction ? txResult.transaction.balance_before : wallet.balance,
      newBalance: txResult.wallet.balance,
      note
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      walletBalance: txResult.wallet.balance
    },
    wallet: txResult.wallet,
    transaction: txResult.transaction
  };
}

function getWalletTransactionsList(query = {}) {
  const transactions = db.get('wallet_transactions');
  const users = db.get('users');

  let list = transactions.map(t => {
    const u = users.find(user => user.id === t.user_id);
    return {
      ...t,
      username: u ? u.username : 'Unknown',
      user_email: u ? u.email : 'Unknown',
      user_full_name: u ? u.full_name : 'Unknown'
    };
  });

  if (query.status) {
    list = list.filter(t => t.status === query.status);
  }

  if (query.type) {
    list = list.filter(t => t.type === query.type);
  }

  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter(t =>
      (t.reference && t.reference.toLowerCase().includes(s)) ||
      (t.username && t.username.toLowerCase().includes(s)) ||
      (t.user_email && t.user_email.toLowerCase().includes(s))
    );
  }

  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function approveWalletTopUp(transactionId, admin) {
  const tx = db.find('wallet_transactions', t => t.id === transactionId || t.reference === transactionId);
  if (!tx) {
    const err = new Error('Wallet transaction not found');
    err.statusCode = 404;
    throw err;
  }

  if (tx.status === 'completed' || tx.status === 'paid') {
    const err = new Error('This transaction is already completed');
    err.statusCode = 400;
    throw err;
  }

  // Credit user wallet
  const result = walletService.deposit(
    tx.user_id,
    tx.amount,
    tx.reference,
    `Admin Approved Top-up ($${Number(tx.amount).toFixed(2)})`
  );

  // Update original transaction status if separate
  db.update('wallet_transactions', t => t.id === tx.id, {
    status: 'completed',
    completed_at: new Date().toISOString()
  });

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName || admin?.username,
    action: 'APPROVE_WALLET_TOPUP',
    targetType: 'WALLET_TRANSACTION',
    targetId: tx.id,
    details: {
      reference: tx.reference,
      userId: tx.user_id,
      amount: tx.amount
    }
  });

  return {
    success: true,
    message: `Successfully approved & credited +$${Number(tx.amount).toFixed(2)} to user wallet!`,
    data: result
  };
}

function rejectWalletTopUp(transactionId, reason, admin) {
  const tx = db.find('wallet_transactions', t => t.id === transactionId || t.reference === transactionId);
  if (!tx) {
    const err = new Error('Wallet transaction not found');
    err.statusCode = 404;
    throw err;
  }

  db.update('wallet_transactions', t => t.id === tx.id, {
    status: 'rejected',
    reject_reason: reason || 'Rejected by administrator',
    rejected_at: new Date().toISOString()
  });

  logAuditAction({
    adminId: admin?.id,
    adminName: admin?.fullName || admin?.username,
    action: 'REJECT_WALLET_TOPUP',
    targetType: 'WALLET_TRANSACTION',
    targetId: tx.id,
    details: {
      reference: tx.reference,
      userId: tx.user_id,
      reason
    }
  });

  return {
    success: true,
    message: 'Transaction rejected successfully'
  };
}

module.exports = {
  logAuditAction,
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockList,
  getAllOrders,
  manualApproveOrder,
  cancelOrder,
  adjustUserBalance,
  getWalletTransactionsList,
  approveWalletTopUp,
  rejectWalletTopUp
};
