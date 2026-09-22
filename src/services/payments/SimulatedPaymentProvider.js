const PaymentProvider = require('./PaymentProvider');

class SimulatedPaymentProvider extends PaymentProvider {
  constructor() {
    super('simulated');
  }

  async createPayment(order) {
    const tranId = `SIM_${order.order_number}_${Date.now()}`;
    return {
      provider: this.name,
      transactionId: tranId,
      status: 'pending',
      simulated: true,
      message: 'Simulated Instant Checkout for testing environment'
    };
  }

  async verifyPayment({ transactionId }) {
    return {
      verified: true,
      transactionId
    };
  }
}

module.exports = SimulatedPaymentProvider;
