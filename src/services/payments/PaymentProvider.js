/**
 * Payment Provider Abstract Interface
 */
class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  async createPayment(order) {
    throw new Error('createPayment() must be implemented by payment provider');
  }

  async verifyPayment(params) {
    throw new Error('verifyPayment() must be implemented by payment provider');
  }

  async handleWebhook(payload, signature) {
    throw new Error('handleWebhook() must be implemented by payment provider');
  }
}

module.exports = PaymentProvider;
