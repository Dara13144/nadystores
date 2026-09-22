const db = require('../config/database');

function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: 'No coupon code specified' };

  const coupon = db.find('coupons', c => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon || !coupon.active) {
    return { valid: false, message: 'Invalid or inactive promo code.' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, message: 'This coupon code has expired.' };
  }

  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, message: 'Coupon usage limit has been reached.' };
  }

  if (coupon.minimum_amount && Number(subtotal) < Number(coupon.minimum_amount)) {
    return {
      valid: false,
      message: `Minimum order of $${Number(coupon.minimum_amount).toFixed(2)} required for this coupon.`
    };
  }

  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (Number(subtotal) * Number(coupon.value)) / 100;
    if (coupon.maximum_discount && discountAmount > Number(coupon.maximum_discount)) {
      discountAmount = Number(coupon.maximum_discount);
    }
  } else if (coupon.type === 'fixed') {
    discountAmount = Number(coupon.value);
  }

  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  return {
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountAmount: Number(discountAmount.toFixed(2))
  };
}

function incrementCouponUsage(code) {
  const coupon = db.find('coupons', c => c.code.toUpperCase() === code.trim().toUpperCase());
  if (coupon) {
    db.update('coupons', c => c.id === coupon.id, {
      used_count: (coupon.used_count || 0) + 1
    });
  }
}

module.exports = {
  validateCoupon,
  incrementCouponUsage
};
