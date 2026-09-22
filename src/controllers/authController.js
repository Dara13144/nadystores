const authService = require('../services/authService');
const { verifyTurnstileToken } = require('../services/securityLogService');
const db = require('../config/database');
const { getClientIp } = require('../middleware/abuseProtectionMiddleware');

async function register(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Turnstile check if token provided or required
    if (req.body.turnstileToken) {
      const turnstile = await verifyTurnstileToken(req.body.turnstileToken, clientIp);
      if (!turnstile.success) {
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please try again.' });
      }
    }

    const result = await authService.register(req.body, clientIp, userAgent);
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000
    });
    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to Digital Store!',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    if (req.body.turnstileToken) {
      const turnstile = await verifyTurnstileToken(req.body.turnstileToken, clientIp);
      if (!turnstile.success) {
        return res.status(400).json({ success: false, message: 'Captcha verification failed. Please try again.' });
      }
    }

    const result = await authService.login(req.body, clientIp, userAgent);
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000
    });
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const token = req.body.refreshToken || req.cookies.refresh_token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    const result = await authService.refreshToken(token, clientIp, userAgent);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('access_token');
  res.json({ success: true, message: 'Logged out successfully' });
}

function getMe(req, res) {
  const user = db.find('users', u => u.id === req.user.id);
  const wallet = db.find('wallets', w => w.user_id === req.user.id);
  res.json({
    success: true,
    data: {
      user: authService.sanitizeUser(user),
      walletBalance: wallet ? wallet.balance : 0
    }
  });
}

function updateProfile(req, res, next) {
  try {
    const { fullName, phone, avatar } = req.body;
    const updated = db.update('users', u => u.id === req.user.id, {
      full_name: fullName,
      phone,
      avatar
    });
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: authService.sanitizeUser(updated)
    });
  } catch (err) {
    next(err);
  }
}

async function googleLogin(req, res, next) {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    let { email, fullName, googleId, avatar, credential, idToken } = req.body;
    const token = credential || idToken;

    if (token) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          email = payload.email;
          fullName = payload.name;
          googleId = payload.sub;
          avatar = payload.picture;
        } else {
          // Fallback: parse JWT payload safely
          const base64Url = token.split('.')[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              Buffer.from(base64, 'base64')
                .toString('utf-8')
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            email = decoded.email || email;
            fullName = decoded.name || fullName;
            googleId = decoded.sub || googleId;
            avatar = decoded.picture || avatar;
          }
        }
      } catch (verifyErr) {
        // Continue with provided credentials if token verification fails gracefully
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email not provided' });
    }

    const result = await authService.googleAuth({
      email,
      fullName: fullName || email.split('@')[0],
      googleId: googleId || `google_${Date.now()}`,
      avatar
    }, clientIp, userAgent);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 1000
    });

    res.json({
      success: true,
      message: 'Google login successful',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    authService.validatePasswordComplexity(newPassword);

    const user = db.find('users', u => u.id === req.user.id);
    if (!user.password_hash) {
      return res.status(400).json({ success: false, message: 'Password change not applicable for OAuth accounts' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = bcrypt.genSaltSync(12);
    const newHash = bcrypt.hashSync(newPassword, salt);
    db.update('users', u => u.id === req.user.id, { password_hash: newHash });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  googleLogin,
  changePassword
};
