const ABAPayWayProvider = require('./ABAPayWayProvider');
const BakongKHQRProvider = require('./BakongKHQRProvider');
const CutLuyProvider = require('./CutLuyProvider');
const WalletPaymentProvider = require('./WalletPaymentProvider');
const SimulatedPaymentProvider = require('./SimulatedPaymentProvider');

const cutLuyInstance = new CutLuyProvider();

const providers = {
  cutluy: cutLuyInstance,
  bakong_khqr: cutLuyInstance, // CutLuy powers Bakong KHQR auto-payments
  khqr: cutLuyInstance,
  aba_payway: new ABAPayWayProvider(),
  wallet: new WalletPaymentProvider(),
  simulated: new SimulatedPaymentProvider()
};

function getPaymentProvider(providerName) {
  const normalized = (providerName || 'cutluy').toLowerCase();
  const provider = providers[normalized] || providers.cutluy;
  return provider;
}

module.exports = {
  providers,
  getPaymentProvider
};
