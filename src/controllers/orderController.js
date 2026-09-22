const orderService = require('../services/orderService');
const { getPaymentProvider } = require('../services/payments');
const db = require('../config/database');
const logger = require('../config/logger');

async function createOrder(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const { customerEmail, customerName, customerPhone, items, couponCode, paymentMethod } = req.body;

    const result = await orderService.createOrder({
      userId,
      customerEmail: customerEmail || (req.user ? req.user.email : ''),
      customerName: customerName || (req.user ? req.user.fullName : ''),
      customerPhone,
      items,
      couponCode,
      paymentMethod
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = orderService.getOrderById(req.params.id, req.user);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
}

function getMyOrders(req, res, next) {
  try {
    const orders = orderService.getUserOrders(req.user.id);
    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
}

async function confirmPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { transactionId, providerPayload } = req.body;
    const updatedOrder = await orderService.confirmOrderPayment(id, { transactionId, providerPayload });
    res.json({
      success: true,
      message: 'Payment confirmed and digital stock unlocked',
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
}

// ABA PayWay webhook / callback handler
async function handleABACallback(req, res, next) {
  try {
    logger.info('Received ABA PayWay callback:', req.body);
    const provider = getPaymentProvider('aba_payway');
    const result = await provider.handleWebhook(req.body);

    if (result.success && req.body.tran_id) {
      // Find order by transaction id or reference
      const order = db.find('orders', o => o.transaction_id === req.body.tran_id || req.body.tran_id.includes(o.order_number));
      if (order) {
        await orderService.confirmOrderPayment(order.id, {
          transactionId: req.body.tran_id,
          providerPayload: req.body
        });
      }
    }
    res.json({ status: '0', message: 'Callback processed' });
  } catch (err) {
    next(err);
  }
}

// Live KHQR / CutLuy Auto-Payment status checker
async function checkBakongStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = db.find('orders', o => o.id === orderId || o.order_number === orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // If order is still pending, query CutLuy live status
    if (order.payment_status === 'pending' && order.transaction_id) {
      try {
        const cutLuy = getPaymentProvider('cutluy');
        const liveStatus = await cutLuy.checkPaymentStatus(order.transaction_id);

        if (liveStatus.status === 'paid') {
          logger.info(`[CutLuy Auto-Payment] Detected live payment for order ${order.order_number}! Auto-fulfilling...`);
          const confirmedOrder = await orderService.confirmOrderPayment(order.id, {
            transactionId: order.transaction_id,
            providerPayload: liveStatus
          });

          return res.json({
            success: true,
            status: 'paid',
            data: {
              orderId: confirmedOrder.id,
              orderNumber: confirmedOrder.order_number,
              paymentStatus: confirmedOrder.payment_status,
              deliveryStatus: confirmedOrder.delivery_status,
              status: 'paid',
              order: confirmedOrder
            }
          });
        } else if (liveStatus.status === 'scanned') {
          return res.json({
            success: true,
            status: 'scanned',
            data: {
              orderId: order.id,
              orderNumber: order.order_number,
              paymentStatus: order.payment_status,
              deliveryStatus: order.delivery_status,
              status: 'scanned'
            }
          });
        }
      } catch (err) {
        logger.warn(`Error polling CutLuy live status for ${order.order_number}:`, err.message);
      }
    }

    res.json({
      success: true,
      status: order.payment_status === 'paid' ? 'paid' : order.payment_status,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        deliveryStatus: order.delivery_status,
        status: order.payment_status === 'paid' ? 'paid' : order.payment_status,
        order: order.payment_status === 'paid' ? orderService.getOrderById(order.id, req.user) : null
      }
    });
  } catch (err) {
    next(err);
  }
}

// CutLuy Webhook Handler
async function handleCutLuyWebhook(req, res, next) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.get('X-CutLuy-Signature') || '';
    const cutLuy = getPaymentProvider('cutluy');

    if (!cutLuy.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[CutLuy Webhook] Invalid signature rejected');
      return res.status(400).send('invalid signature');
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.info('[CutLuy Webhook] Received webhook event:', event?.type);

    if (event.type === 'payment.completed' || event.data?.payment?.status === 'paid') {
      const paymentData = event.data?.payment || event.payment || event;
      const referenceId = paymentData.reference_id;
      const paymentId = paymentData.id;

      logger.info(`[CutLuy Webhook] Fulfilling payment for reference: ${referenceId}`);

      if (referenceId) {
        // 1. Check if it's a Wallet Deposit
        if (referenceId.startsWith('WALLET-') || referenceId.startsWith('DEP-')) {
          const walletService = require('../services/walletService');
          const tx = db.find('wallet_transactions', t => t.reference === referenceId);
          if (tx && tx.status === 'pending') {
            await walletService.deposit(tx.user_id, tx.amount, referenceId, 'CutLuy KHQR Auto Top-up');
            logger.info(`[CutLuy Webhook] Auto-credited $${tx.amount} to user ${tx.user_id}`);
          }
        } else {
          // 2. It's a Store Order
          const order = db.find('orders', o => o.order_number === referenceId || o.transaction_id === paymentId || o.id === referenceId);
          if (order) {
            await orderService.confirmOrderPayment(order.id, {
              transactionId: paymentId,
              providerPayload: paymentData
            });
            logger.info(`[CutLuy Webhook] Order ${order.order_number} auto-confirmed & digital stock delivered!`);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error('[CutLuy Webhook Error]:', err.message);
    res.sendStatus(200); // Acknowledge receipt to avoid webhook loops
  }
}

module.exports = {
  createOrder,
  getOrder,
  getMyOrders,
  confirmPayment,
  handleABACallback,
  checkBakongStatus,
  handleCutLuyWebhook
};
