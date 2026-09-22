const couponService = require('../services/couponService');

function validateCoupon(req, res, next) {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code required' });
    }

    const result = couponService.validateCoupon(code, subtotal || 0);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: `Coupon code applied: -$${result.discountAmount.toFixed(2)}`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validateCoupon
};
