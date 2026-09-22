const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../config/logger');
const env = require('../config/env');

// In-memory rapid attack detection tracker
const recentViolations = new Map(); // ip -> { count, firstSeen, lastSeen }

// Sensitive fields to redact from metadata
const REDACT_KEYS = ['password', 'password_hash', 'token', 'refreshToken', 'rawBody', 'secret', 'apiKey', 'authorization', 'cookie'];

function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const clean = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.some(rk => k.toLowerCase().includes(rk))) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeMetadata(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Log a security incident or audit event
 */
function logSecurityEvent({
  userId = null,
  ipAddress = '127.0.0.1',
  eventType = 'SECURITY_INFO',
  endpoint = '',
  method = 'GET',
  userAgent = '',
  statusCode = 200,
  requestCount = 1,
  action = 'LOG',
  metadata = {}
}) {
  const cleanMeta = sanitizeMetadata(metadata);
  const event = {
    id: uuidv4(),
    user_id: userId,
    ip_address: ipAddress,
    event_type: eventType,
    endpoint,
    method,
    user_agent: (userAgent || '').slice(0, 255),
    status_code: statusCode,
    request_count: requestCount,
    action,
    metadata: cleanMeta,
    created_at: new Date().toISOString()
  };

  try {
    db.insert('security_events', event);
    if (['FAILED_LOGIN', 'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_UA', 'IP_BANNED', 'ATTACK_DETECTED', 'ADMIN_UNAUTHORIZED'].includes(eventType)) {
      logger.warn(`[Security Alert] ${eventType} from IP ${ipAddress} on ${method} ${endpoint}: ${action}`);
    }
  } catch (err) {
    logger.error('Failed to log security event:', err.message);
  }

  return event;
}

/**
 * Check if an IP address is currently blocked
 */
function isIpBlocked(ipAddress) {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') return false;

  const now = new Date();
  const record = db.find('blocked_ips', b => b.ip_address === ipAddress && !b.unblocked);

  if (!record) return false;

  if (new Date(record.expires_at) < now) {
    // Temporary ban expired -> auto unblock
    db.update('blocked_ips', b => b.id === record.id, {
      unblocked: true,
      unblocked_by: 'AUTO_EXPIRE',
      unblocked_at: now.toISOString()
    });
    return false;
  }

  return true;
}

/**
 * Temporarily ban an abusive IP address
 */
function banIp(ipAddress, reason = 'Abuse threshold exceeded', durationMinutes = 15, userAgent = '') {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') return null;

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  let existing = db.find('blocked_ips', b => b.ip_address === ipAddress);

  if (existing) {
    db.update('blocked_ips', b => b.id === existing.id, {
      reason,
      violations_count: (existing.violations_count || 1) + 1,
      blocked_at: new Date().toISOString(),
      expires_at: expiresAt,
      unblocked: false,
      unblocked_by: null,
      unblocked_at: null
    });
  } else {
    existing = {
      id: uuidv4(),
      ip_address: ipAddress,
      reason,
      violations_count: 1,
      blocked_at: new Date().toISOString(),
      expires_at: expiresAt,
      unblocked: false,
      unblocked_by: null,
      unblocked_at: null
    };
    db.insert('blocked_ips', existing);
  }

  logSecurityEvent({
    ipAddress,
    eventType: 'IP_BANNED',
    action: `BLOCKED_${durationMinutes}M`,
    userAgent,
    metadata: { reason, durationMinutes, expiresAt }
  });

  return existing;
}

/**
 * Unblock an IP address manually by Admin
 */
function unblockIp(ipAddress, adminUser = 'Admin') {
  const record = db.find('blocked_ips', b => b.ip_address === ipAddress && !b.unblocked);
  if (!record) return false;

  db.update('blocked_ips', b => b.id === record.id, {
    unblocked: true,
    unblocked_by: adminUser,
    unblocked_at: new Date().toISOString()
  });

  logSecurityEvent({
    ipAddress,
    eventType: 'IP_UNBLOCKED',
    action: 'UNBLOCKED_BY_ADMIN',
    metadata: { adminUser }
  });

  return true;
}

/**
 * Track abnormal rapid violations and auto-quarantine if threshold exceeded
 */
function recordViolation(ipAddress, violationType, userAgent = '', endpoint = '') {
  const now = Date.now();
  const entry = recentViolations.get(ipAddress) || { count: 0, firstSeen: now, lastSeen: now };

  // Reset window if older than 5 minutes
  if (now - entry.firstSeen > 5 * 60 * 1000) {
    entry.count = 0;
    entry.firstSeen = now;
  }

  entry.count += 1;
  entry.lastSeen = now;
  recentViolations.set(ipAddress, entry);

  // Auto-ban after 8 serious violations in 5 minutes
  if (entry.count >= 8) {
    banIp(ipAddress, `Repeated violations (${violationType})`, 30, userAgent);
    recentViolations.delete(ipAddress);
  }
}

/**
 * Verify Cloudflare Turnstile token if configured
 */
async function verifyTurnstileToken(token, clientIp = '') {
  const secretKey = env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If turnstile secret is not set, allow in development
    return { success: true, bypassed: true };
  }

  if (!token) {
    return { success: false, error: 'Turnstile verification token missing' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIp) formData.append('remoteip', clientIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    return {
      success: data.success === true,
      error: data['error-codes'] ? data['error-codes'].join(', ') : null
    };
  } catch (err) {
    logger.error('Turnstile verification network error:', err.message);
    return { success: false, error: 'Turnstile verification service unreachable' };
  }
}

/**
 * Get aggregated security statistics for Admin Dashboard
 */
function getSecurityStats() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const events = db.get('security_events');
  const blockedIps = db.get('blocked_ips');

  const todayEvents = events.filter(e => (e.created_at || '').slice(0, 10) === todayStr);
  const activeBans = blockedIps.filter(b => !b.unblocked && new Date(b.expires_at) > now);

  const failedLogins = todayEvents.filter(e => e.event_type === 'FAILED_LOGIN').length;
  const rateLimitViolations = todayEvents.filter(e => e.event_type === 'RATE_LIMIT_EXCEEDED').length;
  const suspiciousRequests = todayEvents.filter(e => ['SUSPICIOUS_UA', 'ATTACK_DETECTED', 'MALICIOUS_INPUT'].includes(e.event_type)).length;

  return {
    overview: {
      totalEventsToday: todayEvents.length,
      failedLoginsToday: failedLogins,
      rateLimitViolationsToday: rateLimitViolations,
      suspiciousRequestsToday: suspiciousRequests,
      activeBlockedIpsCount: activeBans.length
    },
    activeBlockedIps: activeBans.map(b => ({
      id: b.id,
      ip_address: b.ip_address,
      reason: b.reason,
      violations_count: b.violations_count,
      blocked_at: b.blocked_at,
      expires_at: b.expires_at
    })),
    recentEvents: events.slice(-50).reverse()
  };
}

module.exports = {
  logSecurityEvent,
  isIpBlocked,
  banIp,
  unblockIp,
  recordViolation,
  verifyTurnstileToken,
  getSecurityStats
};
