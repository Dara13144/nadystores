const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimitMiddleware');
const { registerSchema, loginSchema } = require('../validators/authValidators');

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/change-password', authMiddleware, passwordResetLimiter, authController.changePassword);

module.exports = router;
