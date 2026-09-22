const db = require('../config/database');
const env = require('../config/env');

async function getSecureDownloadUrl({ orderId, fileId, user }) {
  const order = db.find('orders', o => o.id === orderId);
  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Check ownership
  const isOwner = user && order.user_id === user.id;
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');

  if (!isOwner && !isAdmin) {
    const err = new Error('Unauthorized. You do not own this order.');
    err.statusCode = 403;
    throw err;
  }

  if (order.payment_status !== 'paid') {
    const err = new Error('Payment not confirmed. Cannot download file.');
    err.statusCode = 400;
    throw err;
  }

  const supabase = db.getSupabase();
  if (supabase) {
    // Generate signed Supabase Storage URL (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(fileId, 60);

    if (error) {
      throw error;
    }
    return { url: data.signedUrl, expiresIn: 60 };
  }

  // Fallback safe simulation URL for testing
  const fallbackToken = Buffer.from(`${orderId}:${fileId}:${Date.now()}`).toString('base64');
  return {
    url: `/api/orders/${orderId}/download-stream/${fileId}?token=${fallbackToken}`,
    expiresIn: 60,
    fileName: `digital_asset_${fileId}.zip`
  };
}

module.exports = {
  getSecureDownloadUrl
};
