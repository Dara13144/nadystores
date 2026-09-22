const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../config/logger');

// Mutex lock for stock allocation
let isAllocating = false;

async function acquireStockLock() {
  while (isAllocating) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  isAllocating = true;
}

function releaseStockLock() {
  isAllocating = false;
}

async function allocateStockForOrder(orderId) {
  await acquireStockLock();
  try {
    const order = db.find('orders', o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const items = db.filter('order_items', i => i.order_id === orderId);
    const deliveries = [];

    for (const item of items) {
      // Find requested quantity of available stock items
      const available = db.filter('digital_stock', s => s.product_id === item.product_id && s.status === 'available');
      if (available.length < item.quantity) {
        logger.warn(`Insufficient stock for product ${item.product_name} in order ${order.order_number}`);
        // Still assign whatever is available, and mark item note
      }

      const allocated = available.slice(0, item.quantity);
      const assignedValues = [];

      for (const stockItem of allocated) {
        db.update('digital_stock', s => s.id === stockItem.id, {
          status: 'sold',
          order_id: orderId,
          sold_at: new Date().toISOString()
        });
        assignedValues.push({
          type: stockItem.type,
          value: stockItem.value,
          delivered_at: new Date().toISOString()
        });
      }

      // If manual delivery or download, provide placeholder / signed URL link
      if (assignedValues.length === 0 && item.delivery_type === 'Download') {
        assignedValues.push({
          type: 'Download',
          value: `/api/orders/${orderId}/download/${item.product_id}`,
          delivered_at: new Date().toISOString()
        });
      }

      // Update order item with delivered credentials
      db.update('order_items', i => i.id === item.id, {
        delivered_data: assignedValues
      });

      deliveries.push({
        product_id: item.product_id,
        product_name: item.product_name,
        credentials: assignedValues
      });
    }

    // Mark order delivered
    db.update('orders', o => o.id === orderId, {
      delivery_status: 'delivered',
      status: 'completed',
      updated_at: new Date().toISOString()
    });

    // Notify user
    if (order.user_id) {
      db.insert('notifications', {
        id: uuidv4(),
        user_id: order.user_id,
        title: `Order #${order.order_number} Delivered!`,
        message: 'Your digital subscription credentials have been unlocked and are ready in your account.',
        type: 'order',
        is_read: false,
        link: `/orders/${order.id}`,
        created_at: new Date().toISOString()
      });
    }

    logger.info(`Stock allocated and order ${order.order_number} marked COMPLETED.`);
    return deliveries;
  } finally {
    releaseStockLock();
  }
}

function bulkImportStock({ productId, rawText, type = 'Account' }) {
  if (!productId || !rawText) {
    throw new Error('Product ID and stock text lines are required.');
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let importedCount = 0;

  for (const line of lines) {
    db.insert('digital_stock', {
      id: uuidv4(),
      product_id: productId,
      value: line,
      type,
      status: 'available',
      created_at: new Date().toISOString()
    });
    importedCount++;
  }

  // Update product stock_count
  const totalAvailable = db.filter('digital_stock', s => s.product_id === productId && s.status === 'available').length;
  db.update('products', p => p.id === productId, { stock_count: totalAvailable });

  return { importedCount, totalAvailable };
}

function addSingleStock({ productId, value, type = 'Account' }) {
  if (!productId || !value) {
    throw new Error('Product ID and stock value are required.');
  }

  const stockItem = {
    id: uuidv4(),
    product_id: productId,
    value: value.trim(),
    type,
    status: 'available',
    created_at: new Date().toISOString()
  };

  db.insert('digital_stock', stockItem);

  const totalAvailable = db.filter('digital_stock', s => s.product_id === productId && s.status === 'available').length;
  db.update('products', p => p.id === productId, { stock_count: totalAvailable });

  return { stockItem, totalAvailable };
}

function deleteStockItem(stockId) {
  const item = db.find('digital_stock', s => s.id === stockId);
  if (!item) {
    throw new Error('Stock item not found');
  }

  const productId = item.product_id;
  const deleted = db.remove('digital_stock', s => s.id === stockId);

  const totalAvailable = db.filter('digital_stock', s => s.product_id === productId && s.status === 'available').length;
  db.update('products', p => p.id === productId, { stock_count: totalAvailable });

  return { deleted, totalAvailable };
}

module.exports = {
  allocateStockForOrder,
  bulkImportStock,
  addSingleStock,
  deleteStockItem
};
