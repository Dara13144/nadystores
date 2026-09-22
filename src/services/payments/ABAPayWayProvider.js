const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');
const env = require('../../config/env');
const logger = require('../../config/logger');

class ABAPayWayProvider extends PaymentProvider {
  constructor() {
    super('aba_payway');
    this.merchantId = env.ABA_MERCHANT_ID;
    this.apiKey = env.ABA_API_KEY;
    this.apiUrl = env.ABA_API_URL;
  }

  generateHash(rawString) {
    return crypto.createHmac('sha512', this.apiKey).update(rawString).digest('base64');
  }

  async createPayment(order) {
    const reqTime = Math.floor(Date.now() / 1000).toString();
    const tranId = `ABA_${order.order_number}_${Date.now()}`;
    const amount = Number(order.total).toFixed(2);
    const returnUrl = Buffer.from(env.ABA_RETURN_URL).toString('base64');
    const cancelUrl = Buffer.from(env.ABA_CANCEL_URL).toString('base64');

    // ABA PayWay hash string formula
    const hashString = `${reqTime}${this.merchantId}${tranId}${amount}${returnUrl}${cancelUrl}`;
    const hash = this.generateHash(hashString);

    logger.info(`Generated ABA PayWay payment request for order: ${order.order_number}, tran_id: ${tranId}`);

    return {
      provider: this.name,
      transactionId: tranId,
      paymentUrl: `${this.apiUrl}?tran_id=${tranId}&req_time=${reqTime}&merchant_id=${this.merchantId}&hash=${encodeURIComponent(hash)}`,
      paymentData: {
        merchant_id: this.merchantId,
        tran_id: tranId,
        amount,
        req_time: reqTime,
        hash,
        return_url: env.ABA_RETURN_URL,
        cancel_url: env.ABA_CANCEL_URL
      }
    };
  }

  async verifyPayment({ tran_id, hash, status }) {
    if (!tran_id) {
      return { verified: false, message: 'Missing transaction ID' };
    }

    // In sandbox or production mode, verify callback status
    const isSuccess = status === '0' || status === 'paid' || status === 'COMPLETED';
    return {
      verified: isSuccess,
      transactionId: tran_id,
      amount: null
    };
  }

  async handleWebhook(payload) {
    const { tran_id, status, hash } = payload;
    const isSuccess = status === '0' || status === 'paid';
    return {
      success: isSuccess,
      transactionId: tran_id,
      data: payload
    };
  }
}

module.exports = ABAPayWayProvider;
