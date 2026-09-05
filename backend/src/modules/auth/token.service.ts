import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

export const tokenService = {
  // Generate JWT access token
  generateAccessToken(
    payload: { id: string; email: string; role: string; ownerId: string; deviceId?: string; phoneNumber?: string }
  ): string {

    const secret = config.jwtSecret;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    return jwt.sign(payload, secret, {
      expiresIn: config.jwtExpiresIn as any || '4h',
    });
  },


  // Verify JWT token
  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret!);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  // Generate secure random token
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Generate email verification token
  generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Generate password reset token
  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Set password reset expiry (1 hour from now)
  getPasswordResetExpiry(): Date {
    return new Date(Date.now() + 3600000); // 1 hour
  },
};