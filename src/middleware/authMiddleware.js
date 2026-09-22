const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/database');

function authMiddleware(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = db.find('users', u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      avatar: user.avatar
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token expired.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = db.find('users', u => u.id === decoded.userId);
      if (user && user.status === 'active') {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          avatar: user.avatar
        };
      }
    }
  } catch (err) {
    // Ignore error for optional authentication
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
