const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

function getWallet(userId) {
  let wallet = db.find('wallets', w => w.user_id === userId);
  if (!wallet) {
    wallet = {
      id: uuidv4(),
      user_id: userId,
      balance: 0.00,
      currency: 'USD',
      total_deposited: 0.00,
      total_spent: 0.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.insert('wallets', wallet);
  }

  const transactions = db.filter('wallet_transactions', t => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    wallet,
    transactions
  };
}

function deposit(userId, amount, reference = '', description = 'Balance deposit') {
  const depositAmt = Number(amount);
  if (depositAmt <= 0) throw new Error('Deposit amount must be greater than zero.');

  let wallet = db.find('wallets', w => w.user_id === userId);
  if (!wallet) {
    getWallet(userId);
    wallet = db.find('wallets', w => w.user_id === userId);
  }

  const balanceBefore = Number(wallet.balance || 0);
  const balanceAfter = Number((balanceBefore + depositAmt).toFixed(2));
  const newTotalDeposited = Number((Number(wallet.total_deposited || 0) + depositAmt).toFixed(2));

  db.update('wallets', w => w.user_id === userId, {
    balance: balanceAfter,
    total_deposited: newTotalDeposited,
    updated_at: new Date().toISOString()
  });

  // Also update user's cached wallet balance
  db.update('users', u => u.id === userId, {
    wallet_balance: balanceAfter,
    updated_at: new Date().toISOString()
  });

  let tx = null;
  if (reference) {
    const existingTx = db.find('wallet_transactions', t => t.reference === reference && t.user_id === userId);
    if (existingTx) {
      tx = db.update('wallet_transactions', t => t.id === existingTx.id, {
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        amount: depositAmt,
        status: 'completed',
        description,
        updated_at: new Date().toISOString()
      });
    }
  }

  if (!tx) {
    tx = {
      id: uuidv4(),
      user_id: userId,
      type: 'deposit',
      amount: depositAmt,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference: reference || `DEP-${Date.now()}`,
      status: 'completed',
      description,
      created_at: new Date().toISOString()
    };
    db.insert('wallet_transactions', tx);
  }

  const updatedWallet = db.find('wallets', w => w.user_id === userId);
  return { wallet: updatedWallet, transaction: tx };
}

function deduct(userId, amount, reference = '', description = 'Purchase deduction') {
  const deductAmt = Number(amount);
  if (deductAmt <= 0) throw new Error('Deduction amount must be greater than zero.');

  const wallet = db.find('wallets', w => w.user_id === userId);
  if (!wallet || Number(wallet.balance) < deductAmt) {
    const err = new Error('Insufficient wallet balance.');
    err.statusCode = 400;
    throw err;
  }

  const balanceBefore = Number(wallet.balance);
  const balanceAfter = Number((balanceBefore - deductAmt).toFixed(2));
  const newTotalSpent = Number((Number(wallet.total_spent || 0) + deductAmt).toFixed(2));

  db.update('wallets', w => w.user_id === userId, {
    balance: balanceAfter,
    total_spent: newTotalSpent
  });

  const tx = {
    id: uuidv4(),
    user_id: userId,
    type: 'purchase',
    amount: deductAmt,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    reference: reference || `PURCHASE-${Date.now()}`,
    status: 'completed',
    description,
    created_at: new Date().toISOString()
  };

  db.insert('wallet_transactions', tx);
  return { wallet: db.find('wallets', w => w.user_id === userId), transaction: tx };
}

module.exports = {
  getWallet,
  deposit,
  deduct
};
