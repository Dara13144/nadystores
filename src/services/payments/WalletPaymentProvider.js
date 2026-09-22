const PaymentProvider = require('./PaymentProvider');
const walletService = require('../walletService');
const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

class WalletPaymentProvider extends PaymentProvider {
  constructor() {
    super('wallet');
  }

  async createPayment(order) {
    let userId = order.user_id;

    // If order has no user_id (guest checkout), try finding existing user by email
    if (!userId && order.customer_email) {
      const existingUser = db.find('users', u => u.email && u.email.toLowerCase() === order.customer_email.toLowerCase());
      if (existingUser) {
        userId = existingUser.id;
        db.update('orders', o => o.id === order.id, { user_id: userId });
      }
    }

    if (!userId) {
      const err = new Error('Please log in or provide your registered email to pay with wallet balance.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Get user wallet
    const { wallet } = walletService.getWallet(userId);
    const orderTotal = Number(order.total);
    const currentBalance = Number(wallet.balance || 0);

    // 2. Strict Real-Money Balance Check
    if (currentBalance < orderTotal) {
      const shortage = Number((orderTotal - currentBalance).toFixed(2));
      const err = new Error(`Insufficient wallet balance. Your balance is $${currentBalance.toFixed(2)}, but order total is $${orderTotal.toFixed(2)} (Shortage: $${shortage.toFixed(2)}). Please top-up your wallet via ABA KHQR first.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Deduct real balance from user's wallet
    const tx = walletService.deduct(
      userId,
      orderTotal,
      `PAY-${order.order_number}`,
      `Purchase for Order #${order.order_number}`
    );

    return {
      provider: this.name,
      transactionId: tx.transaction.reference,
      status: 'paid',
      autoConfirmed: true,
      balanceBefore: tx.transaction.balance_before,
      balanceAfter: tx.transaction.balance_after
    };
  }

  async verifyPayment() {
    return { verified: true };
  }
}

module.exports = WalletPaymentProvider;
