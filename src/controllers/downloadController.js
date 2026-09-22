const downloadService = require('../services/downloadService');

async function getDownloadLink(req, res, next) {
  try {
    const { id, fileId } = req.params;
    const result = await downloadService.getSecureDownloadUrl({
      orderId: id,
      fileId,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Temporary secure download link generated',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

// Fallback simulated file stream for testing
function streamDownload(req, res) {
  const { id, fileId } = req.params;
  res.setHeader('Content-Disposition', `attachment; filename="subscription_${fileId || 'item'}.txt"`);
  res.setHeader('Content-Type', 'text/plain');
  res.send(`=== DIGITAL STORE SECURE ASSET ===\nOrder ID: ${id}\nItem Reference: ${fileId}\nDelivery Verification: PASSED\nTimestamp: ${new Date().toISOString()}\nThank you for choosing Digital Subscription Store!`);
}

module.exports = {
  getDownloadLink,
  streamDownload
};
