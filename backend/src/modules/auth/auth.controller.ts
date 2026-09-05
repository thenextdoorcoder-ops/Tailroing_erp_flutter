import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../shared/middleware/auth.middleware';
import { config } from '../../config/env';
import prisma from '../../lib/prisma';
import { tokenService } from './token.service';
import { emailService } from '../shared/services/email.service';
import { securityAuditService } from '../shared/services/securityAudit.service';

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, confirmPassword, shopName } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phoneNumber || !password || !shopName) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const result = await authService.register({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      shopName,
    });

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user: result,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
};

// Verify Email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await authService.verifyEmail(token as string);

    res.json(result);
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: error.message || 'Email verification failed' });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.phoneNumber;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    const result = await authService.login(identifier, password);

    // Log successful login
    securityAuditService.logAuthEvent({
      event: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      userId: result.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { identifier },
    });

    // 🔐 Store JWT in HTTP-only cookie
    res
      .cookie('token', result.token, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
      })
      .json({ user: result.user, token: result.token });

  } catch (error: any) {
    console.error('Login error:', error);
    // Log failed login attempt
    securityAuditService.logAuthEvent({
      event: 'LOGIN_FAILED',
      status: 'FAILURE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: req.body.email, reason: error.message },
    });
    res.status(401).json({ error: error.message || 'Login failed' });
  }
};

//Logout

export const logout = async (req: AuthRequest, res: Response) => {
  // Log logout event
  securityAuditService.logAuthEvent({
    event: 'LOGOUT',
    status: 'SUCCESS',
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res
    .clearCookie('token')
    .json({ message: 'Logged out successfully' });
};




// Get Current User
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        shopName: true,
        logoUrl: true,
        signatureUrl: true,
        invoiceSettings: true,
        address: true,
        gender: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has a password, we must verify the current one
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const isPasswordValid = await authService.comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
    // If user has NO password (Google-only), we allow setting it without a currentPassword

    // Validate new password
    const passwordValidation = authService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const hashedPassword = await authService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    securityAuditService.logAuthEvent({
      event: 'PASSWORD_CHANGED',
      status: 'SUCCESS',
      userId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.forgotPassword(email);

    res.json(result);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(400).json({ error: error.message || 'Failed to process request' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const result = await authService.resetPassword(token, password);

    res.json(result);
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: error.message || 'Password reset failed' });
  }
};

// Google OAuth Callback
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { googleId, email, firstName, lastName, isEcomCustomer } = req.body;

    // Only googleId and email are required — names can be empty for some Google profiles
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Invalid Google profile data' });
    }

    const result = await authService.googleAuth({
      googleId,
      email,
      firstName,
      lastName,
      isEcomCustomer,
    });

    // Log successful Google login
    securityAuditService.logAuthEvent({
      event: 'GOOGLE_LOGIN_SUCCESS',
      status: 'SUCCESS',
      userId: result.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email },
    });

    // 🔐 Store JWT in HTTP-only cookie
    res
      .cookie('token', result.token, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000,
      })
      .json({ user: result.user, token: result.token, needsPassword: result.needsPassword });

  } catch (error: any) {
    console.error('Google auth error:', error);
    securityAuditService.logAuthEvent({
      event: 'GOOGLE_LOGIN_FAILED',
      status: 'FAILURE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: req.body.email, reason: error.message },
    });
    res.status(400).json({ error: error.message || 'Google authentication failed' });
  }
};


// -------------------------------------------------------------------------
// OTP Auth
// -------------------------------------------------------------------------

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const result = await authService.sendOtp(phoneNumber);
    if (!result.success) {
      securityAuditService.logAuthEvent({
        event: 'OTP_SENT',
        status: 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { phoneNumber, reason: result.message },
      });
      return res.status(429).json({ error: result.message });
    }
    securityAuditService.logAuthEvent({
      event: 'OTP_SENT',
      status: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { phoneNumber },
    });
    res.json({ message: result.message || 'OTP sent successfully' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(400).json({ error: error.message || 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp, deviceId } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
    const result = await authService.verifyOtpAndLogin(phoneNumber, otp, {
      deviceId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket?.remoteAddress,
    });

    // Log successful OTP verification
    securityAuditService.logAuthEvent({
      event: 'OTP_VERIFIED',
      status: 'SUCCESS',
      userId: result.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { phoneNumber },
    });

    res
      .cookie('token', result.token, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: result.user,
        token: result.token,
        deviceId: result.deviceId,
        needsEmailVerification: result.needsEmailVerification,
      });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    // Log failed OTP attempt
    securityAuditService.logAuthEvent({
      event: 'OTP_FAILED',
      status: 'FAILURE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { phoneNumber: req.body.phoneNumber, reason: error.message },
    });
    let message = error.message || 'OTP verification failed';
    if (message === 'Invalid OTP' || message === 'Invalid or expired OTP.') {
      message = 'Wrong OTP. Please try again.';
    }
    res.status(400).json({ error: message });
  }
};

export const completeProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await authService.completeProfile(req.user!.id, { email, firstName, lastName });
    res.json({ message: 'Profile updated. Please check your email to verify.' });
  } catch (error: any) {
    console.error('Complete profile error:', error);
    res.status(400).json({ error: error.message || 'Failed to update profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, address, gender, phoneNumber } = req.body;
    const result = await authService.updateProfile(req.user!.id, { firstName, lastName, email, address, gender, phoneNumber });
    res.json({ message: 'Profile updated successfully', user: result.user });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message || 'Failed to update profile' });
  }
};

// Resend Verification Email
export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = tokenService.generateEmailVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken },
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email!, verificationToken, user.firstName);

    res.json({ message: 'Verification email sent successfully' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

// Delete Profile (GDPR)
export const deleteProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.deleteProfile(req.user!.id);
    res
      .clearCookie('token')
      .json(result);
  } catch (error: any) {
    console.error('Delete profile error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete account' });
  }
};