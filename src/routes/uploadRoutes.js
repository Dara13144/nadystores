const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { logSecurityEvent, recordViolation } = require('../services/securityLogService');
const { getClientIp } = require('../middleware/abuseProtectionMiddleware');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm'
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

function validateMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 4) return false;
  const hex = buffer.toString('hex', 0, 8);

  if (ext === '.jpg' || ext === '.jpeg') {
    return hex.startsWith('ffd8ff');
  }
  if (ext === '.png') {
    return hex.startsWith('89504e47');
  }
  if (ext === '.gif') {
    return hex.startsWith('47494638');
  }
  if (ext === '.webp') {
    return hex.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
    return true; // Video container validation
  }
  return false;
}

// Secure upload handler
router.post('/', optionalAuth, (req, res, next) => {
  const clientIp = getClientIp(req);
  try {
    const { data, filename, type } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Media payload is required' });
    }

    let base64Content = data;
    let mimeType = 'image/png';
    let ext = '.png';

    if (data.includes(';base64,')) {
      const parts = data.split(';base64,');
      mimeType = parts[0].split(':')[1]?.toLowerCase() || '';
      base64Content = parts[1];

      if (!ALLOWED_MIME_TYPES[mimeType]) {
        logSecurityEvent({
          ipAddress: clientIp,
          eventType: 'MALICIOUS_UPLOAD_ATTEMPT',
          endpoint: '/api/upload',
          method: 'POST',
          action: 'DISALLOWED_MIME_TYPE',
          metadata: { mimeType, filename }
        });
        return res.status(400).json({
          success: false,
          error: 'INVALID_FILE_TYPE',
          message: 'Invalid file type. Only JPG, PNG, WEBP, and MP4 files are permitted.'
        });
      }
      ext = ALLOWED_MIME_TYPES[mimeType];
    } else if (filename) {
      const fileExt = path.extname(filename).toLowerCase();
      const matched = Object.entries(ALLOWED_MIME_TYPES).find(([_, e]) => e === fileExt);
      if (!matched) {
        logSecurityEvent({
          ipAddress: clientIp,
          eventType: 'MALICIOUS_UPLOAD_ATTEMPT',
          endpoint: '/api/upload',
          method: 'POST',
          action: 'DISALLOWED_FILE_EXTENSION',
          metadata: { filename }
        });
        return res.status(400).json({
          success: false,
          error: 'INVALID_FILE_EXTENSION',
          message: 'Invalid file extension.'
        });
      }
      ext = fileExt;
    }

    const buffer = Buffer.from(base64Content, 'base64');
    const isVideo = ext === '.mp4' || ext === '.webm';
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (buffer.length > maxSize) {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `File size exceeds the limit of ${isVideo ? '25MB' : '5MB'}.`
      });
    }

    // Verify magic bytes
    if (!validateMagicBytes(buffer, ext)) {
      logSecurityEvent({
        ipAddress: clientIp,
        eventType: 'SUSPICIOUS_UPLOAD',
        endpoint: '/api/upload',
        method: 'POST',
        action: 'MAGIC_BYTE_MISMATCH',
        metadata: { ext, filename }
      });
      return res.status(400).json({
        success: false,
        error: 'CORRUPTED_FILE',
        message: 'File content does not match the expected image signature.'
      });
    }

    // Generate non-executable UUID safe filename
    const safeName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const uploadDir = path.join(__dirname, '../../public/uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${safeName}`;

    return res.status(201).json({
      success: true,
      message: 'Media uploaded and verified successfully!',
      data: {
        url: fileUrl,
        filename: safeName,
        type: isVideo ? 'video' : 'image',
        size: buffer.length
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
