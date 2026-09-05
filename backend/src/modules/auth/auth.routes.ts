import express from 'express';
import {
  login,
  logout,
  register,
  getMe,
  changePassword,
  verifyEmail,
  forgotPassword,
  resetPassword,
  googleCallback,
  resendVerificationEmail,
  sendOtp,
  verifyOtp,
  completeProfile,
  updateProfile,
  deleteProfile,
} from './auth.controller';
import { authenticateToken } from '../shared/middleware/auth.middleware';
import { registerLimiter, loginLimiter, otpSendLimiter } from '../shared/middleware/rateLimiter.middleware';
import { validateBody } from '../shared/middleware/validate.middleware';
import { sendOtpSchema, verifyOtpSchema, completeProfileSchema } from '../shared/validators/schema.validators';

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/otp/send', otpSendLimiter, validateBody(sendOtpSchema), sendOtp);
router.post('/otp/verify', validateBody(verifyOtpSchema), verifyOtp);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google/callback', googleCallback);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);
router.post('/complete-profile', authenticateToken, validateBody(completeProfileSchema), completeProfile);
router.put('/profile', authenticateToken, updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);
router.post('/logout', authenticateToken, logout);

export default router;