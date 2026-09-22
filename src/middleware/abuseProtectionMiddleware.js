const { isIpBlocked, logSecurityEvent, recordViolation } = require('../services/securityLogService');
const logger = require('../config/logger');

// Known malicious user agent signatures
const MALICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /acunetix/i,
  /masscan/i,
  /zgrab/i,
  /nmap/i,
  /wpscan/i,
  /openvas/i,
  /havij/i,
  /dirbuster/i,
  /gobuster/i,
  /netsparker/i,
  /feeddemon/i
];

// Suspicious URL traversal or scanner target patterns
const SUSPICIOUS_PATH_PATTERNS = [
  /\.\.\//, // Directory traversal
  /\.env($|\/|\?)/i,
  /\.git($|\/|\?)/i,
  /wp-login\.php/i,
  /xmlrpc\.php/i,
  /phpmyadmin/i,
  /adminer\.php/i,
  /\.aws\//i,
  /\/etc\/passwd/i,
  /<script/i,
  /union\s+select/i
];

function getClientIp(req) {
  // Trust Cloudflare header if present, then standard forwarded headers
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function abuseProtectionMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  req.clientIp = clientIp;
  const userAgent = req.headers['user-agent'] || '';
  const path = req.originalUrl || req.url;

  // 1. Check if IP is in temporary or persistent quarantine
  if (isIpBlocked(clientIp)) {
    logSecurityEvent({
      ipAddress: clientIp,
      eventType: 'BLOCKED_IP_REJECTED',
      endpoint: path,
      method: req.method,
      userAgent,
      statusCode: 403,
      action: 'DROPPED_BLOCKED_IP'
    });

    return res.status(403).json({
      success: false,
      error: 'ACCESS_RESTRICTED',
      message: 'Access from this IP address has been temporarily restricted due to suspicious activity. Please try again later.'
    });
  }

  // 2. Detect Malicious Scanner User-Agents
  for (const pattern of MALICIOUS_UA_PATTERNS) {
    if (pattern.test(userAgent)) {
      logSecurityEvent({
        ipAddress: clientIp,
        eventType: 'SUSPICIOUS_UA',
        endpoint: path,
        method: req.method,
        userAgent,
        statusCode: 403,
        action: 'BLOCKED_MALICIOUS_SCANNER',
        metadata: { matchedPattern: pattern.toString() }
      });

      recordViolation(clientIp, 'MALICIOUS_USER_AGENT', userAgent, path);

      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Request blocked by automated security filter.'
      });
    }
  }

  // 3. Detect Probing & Exploit Path Traversal attempts
  for (const pattern of SUSPICIOUS_PATH_PATTERNS) {
    if (pattern.test(path)) {
      logSecurityEvent({
        ipAddress: clientIp,
        eventType: 'ATTACK_DETECTED',
        endpoint: path,
        method: req.method,
        userAgent,
        statusCode: 400,
        action: 'BLOCKED_EXPLOIT_PAYLOAD',
        metadata: { matchedPattern: pattern.toString() }
      });

      recordViolation(clientIp, 'EXPLOIT_PATH_PROBING', userAgent, path);

      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Malicious request pattern detected and dropped.'
      });
    }
  }

  next();
}

module.exports = { abuseProtectionMiddleware, getClientIp };
