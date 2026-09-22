const PaymentProvider = require('./PaymentProvider');
const BakongKHQRProvider = require('./BakongKHQRProvider');
const env = require('../../config/env');
const logger = require('../../config/logger');
const crypto = require('crypto');

class CutLuyProvider extends PaymentProvider {
  constructor() {
    super('cutluy');
    this.apiKey = env.CUTLUY_API_KEY || 'ck_live_46AmMZQzDN9iCnWm4ZZF-cYrtLVqM_eo';
    this.apiUrl = env.CUTLUY_API_URL || 'https://cutluy.com/v1/payments';
    this.webhookSecret = env.CUTLUY_WEBHOOK_SECRET;
    this.bakongFallback = new BakongKHQRProvider();
  }

  async createPayment(order) {
    const amount = Number(order.total || order.amount || 1.00);
    const referenceId = order.order_number || order.reference || `ORD_${Date.now()}`;

    try {
      logger.info(`[CutLuy] Requesting dynamic KHQR payment for ${referenceId} - $${amount.toFixed(2)}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount.toFixed(2)),
          reference_id: referenceId
        })
      });

      if (response.ok) {
        const payment = await response.json();
        logger.info(`[CutLuy] Payment created successfully. ID: ${payment.id}`);

        const qrString = payment.qr_string || '';
        const qrSvgUrl = qrString
          ? `https://cutluy.com/api/render/khqr/${encodeURIComponent(qrString)}.svg`
          : '';

        return {
          provider: 'cutluy',
          transactionId: payment.id,
          paymentId: payment.id,
          qrString: qrString,
          qrSvgUrl: qrSvgUrl,
          checkoutUrl: payment.checkout_url || '',
          amount: payment.amount || amount.toFixed(2),
          currency: payment.currency || 'USD',
          status: payment.status || 'pending',
          expiresIn: 300,
          expiresAt: payment.expires_at || new Date(Date.now() + 300000).toISOString()
        };
      } else {
        const errorBody = await response.text();
        logger.warn(`[CutLuy] API returned status ${response.status}: ${errorBody}`);
      }
    } catch (err) {
      logger.error('[CutLuy] Error connecting to CutLuy payment API:', err.message);
    }

    // High-resiliency fallback: Generate standard KHQR if CutLuy API is unreachable
    logger.info(`[CutLuy] Falling back to standard local KHQR generator for ${referenceId}`);
    const fallbackPayment = await this.bakongFallback.createPayment(order);
    return {
      ...fallbackPayment,
      provider: 'cutluy',
      qrSvgUrl: fallbackPayment.qrString
        ? `https://cutluy.com/api/render/khqr/${encodeURIComponent(fallbackPayment.qrString)}.svg`
        : ''
    };
  }

  async checkPaymentStatus(paymentId) {
    if (!paymentId) return { status: 'pending' };

    try {
      const response = await fetch(`${this.apiUrl}/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rawStatus = (data.status || data.paymentStatus || data.state || '').toLowerCase();
        const isPaid = rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'success' || rawStatus === 'succeeded' || rawStatus === 'approved';
        return {
          success: true,
          id: data.id,
          status: isPaid ? 'paid' : (rawStatus || 'pending'), // 'pending' | 'scanned' | 'paid' | 'expired' | 'failed'
          amount: data.amount,
          currency: data.currency,
          referenceId: data.reference_id || data.reference,
          approvedAt: data.approved_at || data.paid_at
        };
      }
    } catch (err) {
      logger.error(`[CutLuy] Error checking status for payment ${paymentId}:`, err.message);
    }

    return { status: 'pending' };
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.webhookSecret) return true; // If no secret configured, accept
    if (!signatureHeader) return false;

    try {
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(p => p.split('='))
      );

      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(`${parts.t}.${rawBody}`)
        .digest('hex');

      const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
      const valid =
        parts.v1 &&
        fresh &&
        crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));

      return valid;
    } catch (e) {
      return false;
    }
  }
}

module.exports = CutLuyProvider;
