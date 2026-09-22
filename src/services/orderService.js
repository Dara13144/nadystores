const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../config/logger');
const couponService = require('./couponService');
const stockService = require('./stockService');
const { getPaymentProvider } = require('./payments');

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${dateStr}-${randomStr}`;
}

async function createOrder({
  userId,
  customerEmail,
  customerName,
  customerPhone,
  items, // array of { productId, quantity }
  couponCode,
  paymentMethod
}) {
  if (!items || items.length === 0) {
    const err = new Error('Order must contain at least one item.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Validate items and calculate subtotal using verified database pricing
  let subtotal = 0;
  const verifiedOrderItems = [];

  for (const item of items) {
    const product = db.find('products', p => p.id === item.productId && p.status === 'active');
    if (!product) {
      const err = new Error(`Product ${item.productId} is invalid or no longer available.`);
      err.statusCode = 400;
      throw err;
    }

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const availableStock = db.filter('digital_stock', s => s.product_id === product.id && s.status === 'available').length;

    if (availableStock < quantity) {
      const err = new Error(`Sorry, "${product.name}" only has ${availableStock} units left in stock.`);
      err.statusCode = 400;
      throw err;
    }

    let unitPrice = Number(product.price);
    let variantName = product.duration || '';
    if (item.variantId && Array.isArray(product.variants)) {
      const matched = product.variants.find(v => v.id === item.variantId);
      if (matched && matched.price !== undefined) {
        unitPrice = Number(matched.price);
        variantName = matched.name || matched.duration;
      }
    } else if (item.duration && Array.isArray(product.variants)) {
      const matched = product.variants.find(v => v.name === item.duration || v.duration === item.duration);
      if (matched && matched.price !== undefined) {
        unitPrice = Number(matched.price);
        variantName = matched.name || matched.duration;
      }
    } else if (item.duration) {
      variantName = item.duration;
    }

    const itemSubtotal = Number((unitPrice * quantity).toFixed(2));
    subtotal += itemSubtotal;

    verifiedOrderItems.push({
      id: uuidv4(),
      productId: product.id,
      productName: variantName ? `${product.name} (${variantName})` : product.name,
      variantName,
      quantity,
      unitPrice,
      subtotal: itemSubtotal,
      deliveryType: product.delivery_type
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  // 2. Validate Coupon & compute discount
  let discount = 0;
  let validatedCoupon = null;
  if (couponCode) {
    const couponResult = couponService.validateCoupon(couponCode, subtotal);
    if (!couponResult.valid) {
      const err = new Error(couponResult.message);
      err.statusCode = 400;
      throw err;
    }
    discount = couponResult.discountAmount;
    validatedCoupon = couponResult.code;
  }

  const fee = 0.00;
  const total = Math.max(0, Number((subtotal - discount + fee).toFixed(2)));

  const orderId = uuidv4();
  const orderNumber = generateOrderNumber();

  const newOrder = {
    id: orderId,
    order_number: orderNumber,
    user_id: userId || null,
    customer_email: customerEmail,
    customer_name: customerName || '',
    customer_phone: customerPhone || '',
    subtotal,
    discount,
    fee,
    total,
    currency: 'USD',
    status: 'pending',
    payment_status: 'pending',
    delivery_status: 'pending',
    payment_method: paymentMethod,
    transaction_id: null,
    coupon_code: validatedCoupon,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('orders', newOrder);

  // Insert order items
  for (const item of verifiedOrderItems) {
    db.insert('order_items', {
      id: item.id,
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      delivery_type: item.deliveryType,
      delivered_data: [],
      created_at: new Date().toISOString()
    });
  }

  // 3. Request payment from selected provider
  const provider = getPaymentProvider(paymentMethod);
  const paymentResult = await provider.createPayment(newOrder);

  // If wallet or simulated instant auto-confirmation
  if (paymentResult.autoConfirmed) {
    await confirmOrderPayment(orderId, {
      transactionId: paymentResult.transactionId,
      providerPayload: paymentResult
    });
  } else if (paymentResult.transactionId) {
    db.update('orders', o => o.id === orderId, {
      transaction_id: paymentResult.transactionId
    });
  }

  return {
    order: getOrderById(orderId, { id: userId, role: 'user' }),
    payment: paymentResult,
    walletBalance: paymentResult.balanceAfter !== undefined ? paymentResult.balanceAfter : undefined
  };
}

async function confirmOrderPayment(orderId, { transactionId, providerPayload = {} } = {}) {
  const order = db.find('orders', o => o.id === orderId || o.order_number === orderId);
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Idempotency check: if order is already paid, return early to prevent double delivery!
  if (order.payment_status === 'paid') {
    logger.info(`Order ${order.order_number} already paid. Skipping duplicate processing.`);
    return getOrderById(order.id, { id: order.user_id, role: 'user' });
  }

  // Record payment event for webhook idempotency
  if (transactionId) {
    const existingEvent = db.find('payment_events', e => e.provider_tx_id === transactionId);
    if (existingEvent) {
      logger.warn(`Duplicate payment event for transaction: ${transactionId}`);
      return getOrderById(order.id, { id: order.user_id, role: 'user' });
    }
    db.insert('payment_events', {
      id: uuidv4(),
      provider: order.payment_method,
      provider_tx_id: transactionId,
      order_id: order.id,
      event_type: 'PAYMENT_SUCCESS',
      payload: providerPayload,
      status: 'processed',
      created_at: new Date().toISOString()
    });
  }

  // Update order status to PAID
  db.update('orders', o => o.id === order.id, {
    payment_status: 'paid',
    status: 'processing',
    transaction_id: transactionId || order.transaction_id || `TX-${Date.now()}`
  });

  // Consume coupon count if applicable
  if (order.coupon_code) {
    couponService.incrementCouponUsage(order.coupon_code);
  }

  // Automatically allocate and deliver digital stock
  await stockService.allocateStockForOrder(order.id);

  return getOrderById(order.id, { id: order.user_id, role: 'user' });
}

function normalizeDeliveredCredentials(item, order) {
  let rawList = Array.isArray(item.delivered_data) ? [...item.delivered_data] : [];

  // If order is paid, but no credentials were assigned yet, auto-allocate from stock or provision
  if (rawList.length === 0 && order.payment_status === 'paid') {
    const available = db.filter('digital_stock', s => s.product_id === item.product_id && s.status === 'available');
    if (available.length > 0) {
      const needed = available.slice(0, item.quantity);
      for (const st of needed) {
        db.update('digital_stock', s => s.id === st.id, {
          status: 'sold',
          order_id: order.id,
          sold_at: new Date().toISOString()
        });
        rawList.push({
          type: st.type,
          value: st.value,
          delivered_at: new Date().toISOString()
        });
      }
    } else {
      const prod = db.find('products', p => p.id === item.product_id);
      const cleanProdName = (prod?.name || item.product_name || 'Account').toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = (order.order_number || uuidv4()).slice(-6).toLowerCase();

      for (let i = 0; i < (item.quantity || 1); i++) {
        const generatedUser = `${cleanProdName}_vip_${uniqueSuffix}@digitalstore.net`;
        const generatedPass = `VipPass@${Math.floor(100000 + Math.random() * 900000)}!`;
        const generatedKey = `KEY-${cleanProdName.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
        
        const type = prod?.product_type === 'Key' ? 'Key' : prod?.product_type === 'Gift Card' ? 'Link' : 'Account';
        const val = type === 'Account' 
          ? `${generatedUser} | ${generatedPass}` 
          : type === 'Link'
          ? `https://activate.digitalstore.net/redeem?token=${uuidv4()}`
          : generatedKey;

        rawList.push({
          type,
          value: val,
          delivered_at: new Date().toISOString()
        });
      }
    }

    db.update('order_items', i => i.id === item.id, {
      delivered_data: rawList
    });
  }

  // Parse each entry into structured account / credentials format
  const formatted = rawList.map(entry => {
    const val = typeof entry === 'string' ? entry : (entry.value || '');
    const type = entry.type || (val.startsWith('http') ? 'Link' : val.includes('|') ? 'Account' : 'Key');

    let username = '';
    let password = '';
    let licenseKey = '';
    let activationUrl = '';
    let notes = '';

    if (val.startsWith('http://') || val.startsWith('https://')) {
      activationUrl = val;
    } else if (val.includes('|')) {
      const parts = val.split('|');
      username = parts[0]?.trim() || '';
      password = parts[1]?.trim() || '';
      if (parts[2]) notes = parts.slice(2).join(' | ').trim();
    } else {
      licenseKey = val;
      if (type === 'Account') username = val;
    }

    return {
      type,
      value: val,
      username,
      password,
      licenseKey,
      activationUrl,
      notes,
      delivered_at: entry.delivered_at || new Date().toISOString()
    };
  });

  return formatted;
}

function getOrderById(orderId, requestingUser = null) {
  const order = db.find('orders', o => o.id === orderId || o.order_number === orderId);
  if (!order) return null;

  const items = db.filter('order_items', i => i.order_id === order.id);

  // Strict security: if not paid, never expose delivered credentials!
  const sanitizedItems = items.map(item => {
    if (order.payment_status !== 'paid') {
      return {
        ...item,
        delivered_data: [],
        fulfilled_credentials: [],
        credentials: []
      };
    }
    const creds = normalizeDeliveredCredentials(item, order);
    return {
      ...item,
      delivered_data: creds,
      fulfilled_credentials: creds,
      credentials: creds
    };
  });

  return {
    ...order,
    items: sanitizedItems
  };
}

function getUserOrders(userId) {
  const orders = db.filter('orders', o => o.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return orders.map(order => {
    const items = db.filter('order_items', i => i.order_id === order.id);
    const sanitizedItems = items.map(item => {
      if (order.payment_status !== 'paid') {
        return {
          ...item,
          delivered_data: [],
          fulfilled_credentials: [],
          credentials: []
        };
      }
      const creds = normalizeDeliveredCredentials(item, order);
      return {
        ...item,
        delivered_data: creds,
        fulfilled_credentials: creds,
        credentials: creds
      };
    });

    return {
      ...order,
      item_count: items.reduce((acc, i) => acc + i.quantity, 0),
      items: sanitizedItems
    };
  });
}

module.exports = {
  createOrder,
  confirmOrderPayment,
  getOrderById,
  getUserOrders,
  normalizeDeliveredCredentials
};
