const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const db = require('../config/database');
const { logSecurityEvent } = require('./securityLogService');

const MAX_FAILED_ATTEMPTS = 15;
const LOCKOUT_MINUTES = 5;

/**
 * Validate password complexity: min 8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special char
 */
function validatePasswordComplexity(password) {
  if (!password || password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.statusCode = 400;
    throw err;
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    const err = new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Check if an email is currently locked out
 */
function checkAccountLockout(email) {
  const normEmail = (email || '').toLowerCase().trim();
  const lockout = db.find('account_lockouts', l => l.email === normEmail);

  if (lockout && lockout.locked_until) {
    const now = new Date();
    const lockExpiry = new Date(lockout.locked_until);
    if (lockExpiry > now) {
      const remainingMins = Math.ceil((lockExpiry - now) / (60 * 1000));
      const err = new Error(`Account temporarily locked due to repeated failed login attempts. Please try again in ${remainingMins} minutes.`);
      err.statusCode = 423; // Locked
      err.code = 'ACCOUNT_LOCKED';
      throw err;
    }
  }
}

/**
 * Record a failed login attempt and lock account if threshold exceeded
 */
function recordFailedLogin(email, clientIp = '', userAgent = '') {
  const normEmail = (email || '').toLowerCase().trim();
  let lockout = db.find('account_lockouts', l => l.email === normEmail);
  const now = new Date();

  if (!lockout) {
    lockout = {
      id: uuidv4(),
      email: normEmail,
      failed_attempts: 1,
      last_failed_at: now.toISOString(),
      locked_until: null,
      created_at: now.toISOString()
    };
    db.insert('account_lockouts', lockout);
  } else {
    const attempts = (lockout.failed_attempts || 0) + 1;
    let lockedUntil = lockout.locked_until;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      logSecurityEvent({
        ipAddress: clientIp,
        eventType: 'ACCOUNT_LOCKED',
        action: `LOCKED_${LOCKOUT_MINUTES}M`,
        userAgent,
        metadata: { email: normEmail, attempts }
      });
    }

    db.update('account_lockouts', l => l.id === lockout.id, {
      failed_attempts: attempts,
      last_failed_at: now.toISOString(),
      locked_until: lockedUntil
    });
  }

  logSecurityEvent({
    ipAddress: clientIp,
    eventType: 'FAILED_LOGIN',
    action: 'INVALID_CREDENTIALS',
    userAgent,
    metadata: { email: normEmail }
  });
}

/**
 * Reset failed attempts on successful login
 */
function resetFailedLogins(email) {
  const normEmail = (email || '').toLowerCase().trim();
  const lockout = db.find('account_lockouts', l => l.email === normEmail);
  if (lockout) {
    db.update('account_lockouts', l => l.id === lockout.id, {
      failed_attempts: 0,
      locked_until: null
    });
  }
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, jti: uuidv4() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

async function register({ email, username, password, fullName, phone }, clientIp = '', userAgent = '') {
  validatePasswordComplexity(password);

  const existingEmail = db.find('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    // Return generic/safe response to prevent user enumeration
    const error = new Error('An account with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const existingUsername = db.find('users', u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUsername) {
    const error = new Error('This username is already taken.');
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    password_hash: passwordHash,
    username: username.trim(),
    full_name: fullName || username,
    phone: phone || '',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    role: 'user',
    status: 'active',
    email_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('users', newUser);

  // Initialize wallet for new user with 0.00 USD balance
  db.insert('wallets', {
    id: uuidv4(),
    user_id: newUser.id,
    balance: 0.00,
    currency: 'USD',
    total_deposited: 0.00,
    total_spent: 0.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  db.insert('notifications', {
    id: uuidv4(),
    user_id: newUser.id,
    title: 'Welcome to Digital Store!',
    message: 'Your account has been created. Top-up your wallet anytime with Bakong / KHQR to purchase subscriptions.',
    type: 'info',
    is_read: false,
    created_at: new Date().toISOString()
  });

  logSecurityEvent({
    userId: newUser.id,
    ipAddress: clientIp,
    eventType: 'REGISTER_SUCCESS',
    action: 'ACCOUNT_CREATED',
    userAgent,
    metadata: { email: newUser.email }
  });

  const tokens = generateTokens(newUser);
  return {
    user: sanitizeUser(newUser),
    ...tokens
  };
}

async function login({ email, password }, clientIp = '', userAgent = '') {
  checkAccountLockout(email);

  const user = db.find('users', u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user) {
    recordFailedLogin(email, clientIp, userAgent);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error(`Your account is ${user.status}. Please contact support.`);
    error.statusCode = 403;
    throw error;
  }

  if (!user.password_hash) {
    recordFailedLogin(email, clientIp, userAgent);
    const error = new Error('Invalid email or password. Please use Google Sign-In if you registered with Google.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    recordFailedLogin(email, clientIp, userAgent);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  resetFailedLogins(email);

  logSecurityEvent({
    userId: user.id,
    ipAddress: clientIp,
    eventType: 'LOGIN_SUCCESS',
    action: 'PASSWORD_LOGIN',
    userAgent,
    metadata: { email: user.email, role: user.role }
  });

  const tokens = generateTokens(user);
  return {
    user: sanitizeUser(user),
    ...tokens
  };
}

async function refreshToken(refreshTokenStr, clientIp = '', userAgent = '') {
  try {
    const decoded = jwt.verify(refreshTokenStr, env.JWT_REFRESH_SECRET);
    const user = db.find('users', u => u.id === decoded.userId);

    if (!user || user.status !== 'active') {
      const error = new Error('Invalid session or user deactivated.');
      error.statusCode = 401;
      throw error;
    }

    const tokens = generateTokens(user);
    return {
      user: sanitizeUser(user),
      ...tokens
    };
  } catch (err) {
    const error = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    throw error;
  }
}

async function googleAuth({ email, fullName, googleId, avatar }, clientIp = '', userAgent = '') {
  const walletService = require('./walletService');
  const ADMIN_EMAILS = ['mdara9695@gmail.com'];
  const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
  const initialRole = isAdminEmail ? 'admin' : 'user';

  let user = db.find('users', u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(1000 + Math.random() * 9000);
    user = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      password_hash: null,
      username,
      full_name: fullName || username,
      phone: '',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      role: initialRole,
      status: 'active',
      email_verified: true,
      google_id: googleId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.insert('users', user);

    // Provision new wallet with 0.00 USD balance
    walletService.getWallet(user.id);
  } else {
    const updates = {};
    if (isAdminEmail && user.role !== 'admin' && user.role !== 'superadmin') {
      updates.role = 'admin';
    }
    if (googleId && !user.google_id) updates.google_id = googleId;
    if (avatar && (!user.avatar || user.avatar.includes('dicebear'))) updates.avatar = avatar;
    if (fullName && (!user.full_name || user.full_name === user.username)) updates.full_name = fullName;
    if (Object.keys(updates).length > 0) {
      user = db.update('users', u => u.id === user.id, updates);
    }
    walletService.getWallet(user.id);
  }

  logSecurityEvent({
    userId: user.id,
    ipAddress: clientIp,
    eventType: 'LOGIN_SUCCESS',
    action: 'GOOGLE_OAUTH',
    userAgent,
    metadata: { email: user.email, role: user.role }
  });

  const tokens = generateTokens(user);
  return {
    user: sanitizeUser(user),
    ...tokens
  };
}

function sanitizeUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  register,
  login,
  refreshToken,
  googleAuth,
  sanitizeUser,
  validatePasswordComplexity,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogins
};
