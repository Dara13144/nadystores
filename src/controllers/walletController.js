const walletService = require('../services/walletService');
const { getPaymentProvider } = require('../services/payments');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

function getWalletInfo(req, res, next) {
  try {
    const data = walletService.getWallet(req.user.id);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

async function createTopUpPayment(req, res, next) {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < 0.01) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is $0.01' });
    }

    const reference = `WALLET-${Date.now().toString().slice(-6)}`;
    const cutLuy = getPaymentProvider('cutluy');
    const payment = await cutLuy.createPayment({
      amount: numAmount,
      order_number: reference,
      reference
    });

    db.insert('wallet_transactions', {
      id: uuidv4(),
      user_id: req.user.id,
      type: 'deposit',
      amount: numAmount,
      balance_before: 0,
      balance_after: 0,
      reference,
      transaction_id: payment.transactionId,
      status: 'pending',
      description: `Pending wallet deposit via CutLuy KHQR ($${numAmount.toFixed(2)})`,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        ...payment,
        reference
      }
    });
  } catch (err) {
    next(err);
  }
}

async function checkTopUpStatus(req, res, next) {
  try {
    const { reference } = req.params;
    const tx = db.find('wallet_transactions', t => t.reference === reference && t.user_id === req.user.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (tx.status === 'completed') {
      const walletInfo = walletService.getWallet(tx.user_id);
      return res.json({
        success: true,
        status: 'paid',
        data: walletInfo
      });
    }

    if (tx.status === 'pending' && tx.transaction_id) {
      try {
        const cutLuy = getPaymentProvider('cutluy');
        const live = await cutLuy.checkPaymentStatus(tx.transaction_id);
        if (live.status === 'paid' || live.status === 'completed' || live.status === 'SUCCESS') {
          const result = walletService.deposit(
            tx.user_id,
            tx.amount,
            reference,
            `CutLuy KHQR Auto Top-up ($${Number(tx.amount).toFixed(2)})`
          );
          return res.json({
            success: true,
            status: 'paid',
            message: `Deposited $${Number(tx.amount).toFixed(2)} to your wallet!`,
            data: result
          });
        } else if (live.status === 'scanned') {
          return res.json({
            success: true,
            status: 'scanned'
          });
        }
      } catch (err) {
        logger.warn(`CutLuy topup status check failed for ${reference}:`, err.message);
      }
    }

    res.json({
      success: true,
      status: tx.status
    });
  } catch (err) {
    next(err);
  }
}

function topUpWallet(req, res, next) {
  try {
    const { amount, method = 'Bakong KHQR' } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid deposit amount required.' });
    }

    const result = walletService.deposit(
      req.user.id,
      amount,
      `TOPUP-${Date.now().toString().slice(-6)}`,
      `Wallet balance top-up via ${method}`
    );

    res.json({
      success: true,
      message: `Successfully topped up $${Number(amount).toFixed(2)} to your wallet!`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWalletInfo,
  createTopUpPayment,
  checkTopUpStatus,
  topUpWallet
};
