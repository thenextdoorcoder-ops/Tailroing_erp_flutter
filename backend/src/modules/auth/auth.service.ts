import { Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { tokenService } from './token.service';
import { emailService } from '../shared/services/email.service';
import { seedService } from '../shared/services/seed.service';
import { otpService } from './otp.service';
import { sessionService } from './session.service';
import { getRedis } from '../../lib/redis';

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCKOUT_SECONDS = 15 * 60; // 15 minutes

async function checkLoginBruteForce(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // Graceful: no Redis = no per-user limit (IP limit still applies)
  const key = `bf:login:${email.toLowerCase()}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, LOGIN_LOCKOUT_SECONDS);
  if (attempts > LOGIN_MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    const minutes = Math.ceil(ttl / 60);
    throw new Error(`Too many failed login attempts. Please try again in ${minutes} minute(s).`);
  }
}

async function clearLoginBruteForce(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`bf:login:${email.toLowerCase()}`);
}

const OTP_ALLOWED_ROLES = ['ADMIN', 'TAILOR_ADMIN', 'STAFF', 'SUPER_ADMIN', 'ECOM_ADMIN', 'CUSTOMER'];

export const authService = {
  // Validate password strength
  validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true };
  },

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  // Compare password
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // Register user
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    password: string;
    shopName: string;
  }) {
    const email = data.email.toLowerCase();
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Generate verification token
    const verificationToken = tokenService.generateEmailVerificationToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: (data.email as string).toLowerCase(),
        phoneNumber: data.phoneNumber!,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        role: Role.TAILOR_ADMIN, // Shop creators should be ADMIN/Owner
        shopName: data.shopName,
        isEmailVerified: false,
      },
    });

    // Seed default categories
    try {
      await seedService.seedDefaults(user.id);
    } catch (error) {
      console.warn('Failed to seed default categories:', error);
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email!,
        verificationToken,
        user.firstName
      );
    } catch (error) {
      console.error('[AuthService] Failed to send verification email during registration:', error);
      // We still return success but the error is now logged clearly
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      shopName: user.shopName,
    };
  },

  // Verify email
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email!, user.firstName);

    return { message: 'Email verified successfully' };
  },

  // Login
  async login(identifier: string, password: string) {
    const rawIdentifier = identifier.trim();
    const isEmail = rawIdentifier.includes('@');
    const normalizedIdentifier = rawIdentifier.toLowerCase();

    // Per-user brute-force protection (distributed via Redis)
    await checkLoginBruteForce(normalizedIdentifier);

    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier }
        : {
            OR: [
              { phoneNumber: rawIdentifier },
              { email: normalizedIdentifier },
            ],
          },
    });

    if (!user) {
      throw new Error('No account found with this email or phone number');
    }

    if (!user.password) {
      throw new Error('Please use Google Sign-In for this account');
    }

    if (!user.isEmailVerified && user.role !== Role.STAFF && isEmail) {
      throw new Error('Please verify your email before logging in');
    }

    if (!user.isActive) {
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Incorrect password. Please try again');
    }

    // Clear failed attempt counter on successful login
    await clearLoginBruteForce(normalizedIdentifier);

    // 🛡️ ENHANCEMENT: If this is an ADMIN/Owner with no categories, seed defaults
    // This provides "self-healing" if a user's initial seeding failed or was skipped
    if (user.role === Role.TAILOR_ADMIN || user.role === Role.SUPER_ADMIN) {
      const categoryCount = await prisma.category.count({
        where: { userId: user.id }
      });
      if (categoryCount === 0) {
        try {
          await seedService.seedDefaults(user.id);
          console.log(`[Login] Seeded defaults for existing user: ${user.email}`);
        } catch (error) {
          console.warn('[Login] Failed to seed defaults for existing user:', error);
        }
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create a DeviceSession so inactivity enforcement applies to admin sessions too
    const { token, deviceId } = await sessionService.createSession(
      {
        id: user.id,
        email: user.email || user.phoneNumber,
        phoneNumber: user.phoneNumber || null,
        role: user.role,
        ownerId: user.ownerId || user.id,
      },
      { deviceId: `app-${user.id}` }
    );

    return {
      token,
      deviceId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        staffRole: user.staffRole,
        ownerId: user.ownerId || user.id,
        shopName: user.shopName,
        phoneNumber: user.phoneNumber,
        logoUrl: user.logoUrl,
        brandLogoUrl: user.brandLogoUrl,
        appIconUrl: user.appIconUrl,
        signatureUrl: user.signatureUrl,
      },
    };
  },

  // Forgot password
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // We allow password reset for Google accounts too, to let them set a first password
    // if (!user.password) {
    //   throw new Error('This account uses Google Sign-In. Password reset is not available.');
    // }

    // Generate reset token
    const resetToken = tokenService.generatePasswordResetToken();
    const resetExpiry = tokenService.getPasswordResetExpiry();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpiry,
      },
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email!, resetToken, user.firstName);

    return { message: 'If the email exists, a reset link has been sent' };
  },

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  },

  async googleAuth(googleProfile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    isEcomCustomer?: boolean;
  }) {
    const normalizedEmail = googleProfile.email.toLowerCase();
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleProfile.googleId }, { email: normalizedEmail }],
      },
    });

    if (user) {
      // Update google ID if email exists but googleId doesn't
      // Also ensure email is marked as verified since they signed in via Google
      if (!user.googleId || !user.isEmailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleProfile.googleId || user.googleId,
            isEmailVerified: true,
          },
        });
      }

      // 🛡️ ENHANCEMENT: If this is an ADMIN/Owner with no categories, seed defaults
      // This helps users like sangeegopi18@gmail.com who might have missing data
      if (user!.role === Role.TAILOR_ADMIN || user!.role === Role.SUPER_ADMIN) {
        const categoryCount = await prisma.category.count({
          where: { userId: user.id }
        });
        if (categoryCount === 0) {
          try {
            await seedService.seedDefaults(user.id);
            console.log(`[GoogleAuth] Seeded defaults for existing user: ${user.email}`);
          } catch (error) {
            console.warn('[GoogleAuth] Failed to seed defaults for existing user:', error);
          }
        }
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          googleId: googleProfile.googleId,
          email: normalizedEmail,
          firstName: googleProfile.firstName || '',
          lastName: googleProfile.lastName || '',  // keep empty if not provided — user can fill in Account page
          isEmailVerified: true,
          role: googleProfile.isEcomCustomer ? Role.CUSTOMER : Role.TAILOR_ADMIN,
          phoneNumber: `G-${googleProfile.googleId}`, // Placeholder — updated when user completes checkout
        },
      });

      // Seed default categories for new Google user if admin
      if (!googleProfile.isEcomCustomer) {
        try {
          await seedService.seedDefaults(user.id);
        } catch (error) {
          console.warn('Failed to seed default categories for Google user:', error);
        }
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = tokenService.generateAccessToken({
      id: user.id,
      email: user.email!,
      phoneNumber: user.phoneNumber || undefined,
      role: user.role,
      ownerId: user.ownerId || user.id,
    });

    // Sanitize placeholder values before sending to the client
    const safeGooglePhone = user.phoneNumber?.startsWith('G-') ? undefined : user.phoneNumber;

    return {
      token,
      needsPassword: !user.password,
      user: {
        id: user.id,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        shopName: user.shopName,
        phoneNumber: safeGooglePhone,
        logoUrl: user.logoUrl,
        brandLogoUrl: user.brandLogoUrl,
        appIconUrl: user.appIconUrl,
        signatureUrl: user.signatureUrl,
      },
    };
  },

  // -------------------------------------------------------------------------
  // OTP Auth (E-Commerce customers + Tailoring staff)
  // -------------------------------------------------------------------------

  async sendOtp(phoneNumber: string, purpose: string = 'LOGIN') {
    if (!otpService.isValidPhone(phoneNumber)) {
      throw new Error('Invalid phone number');
    }
    return otpService.sendOtp(phoneNumber, purpose);
  },

  async verifyOtpAndLogin(
    phoneNumber: string,
    otp: string,
    options?: { deviceId?: string; userAgent?: string; ipAddress?: string }
  ) {
    const result = await otpService.verifyOtp(phoneNumber, otp, 'LOGIN');
    if (!result.valid) {
      throw new Error(result.message || 'Invalid OTP');
    }

    const normalized = otpService.normalizePhone(phoneNumber);

    // Find user by phone (tailoring staff/admin or e-commerce customer)
    let user = await prisma.user.findFirst({
      where: { phoneNumber: normalized },
    });

    // If no user, create CUSTOMER for e-commerce
    if (!user) {
      const placeholderEmail = `otp-${Date.now()}-${normalized.replace(/\+/g, '')}@pending.local`;
      user = await prisma.user.create({
        data: {
          firstName: '',        // Will be filled from checkout address
          lastName: '',         // Will be filled from checkout address
          email: placeholderEmail,
          phoneNumber: normalized,
          role: Role.CUSTOMER,
          isEmailVerified: false,
        },
      });
    }

    if (!user.isActive) {
      throw new Error('Your account has been deactivated.');
    }

    // Tailoring users must have ADMIN, TAILOR_ADMIN, or STAFF
    const isTailoringUser = ([Role.TAILOR_ADMIN, Role.STAFF, Role.SUPER_ADMIN] as any[]).includes(user.role);
    const isEcomCustomer = user.role === 'CUSTOMER';

    if (!isTailoringUser && !isEcomCustomer) {
      throw new Error('OTP login not available for your account type.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, deviceId } = await sessionService.createSession(
      {
        id: user.id,
        email: user.email!,
        phoneNumber: user.phoneNumber,
        role: user.role,
        ownerId: user.ownerId || user.id,
      },
      { ...options, deviceId: options?.deviceId }
    );

    const needsEmail = user.role === 'CUSTOMER' && !user.isEmailVerified && user.email?.includes('@pending.local');

    // Sanitize placeholder values before sending to the client
    const safePhone = user.phoneNumber?.startsWith('G-') ? undefined : user.phoneNumber;
    const safeEmail = user.email?.includes('@pending.local') ? '' : user.email!;
    const safeFirstName = user.firstName || '';
    const safeLastName = user.lastName || '';

    return {
      token,
      deviceId,
      user: {
        id: user.id,
        email: safeEmail,
        phoneNumber: safePhone,
        firstName: safeFirstName,
        lastName: safeLastName,
        role: user.role,
        shopName: user.shopName,
        isEmailVerified: user.isEmailVerified,
      },
      needsEmailVerification: needsEmail,
    };
  },

  async completeProfile(userId: string, data: { email: string; firstName?: string; lastName?: string }) {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new Error('Email already in use');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'CUSTOMER') {
      throw new Error('Invalid request');
    }

    const verificationToken = tokenService.generateEmailVerificationToken();
    await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        firstName: data.firstName ?? user.firstName,
        lastName: data.lastName ?? user.lastName,
        emailVerificationToken: verificationToken,
      },
    });

    try {
      await emailService.sendVerificationEmail(email, verificationToken, data.firstName || user.firstName);
    } catch (err) {
      console.error('[completeProfile] Failed to send verification email:', err);
    }

    return { message: 'Profile updated. Please verify your email.' };
  },

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string; address?: string; gender?: string; phoneNumber?: string }) {
    // ... existing implementation ...
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    let isEmailVerified = user.isEmailVerified;
    let emailVerificationToken = user.emailVerificationToken;

    if (data.email && data.email.toLowerCase().trim() !== user.email?.toLowerCase().trim()) {
      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
      if (existing) {
        throw new Error('Email already in use');
      }
      isEmailVerified = false;
      emailVerificationToken = tokenService.generateEmailVerificationToken();
      try {
        await emailService.sendVerificationEmail(data.email.toLowerCase().trim(), emailVerificationToken, data.firstName || user.firstName);
      } catch (err) {
        console.error('[updateProfile] Failed to send verification email:', err);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName ?? user.firstName,
        lastName: data.lastName ?? user.lastName,
        email: data.email ? data.email.toLowerCase().trim() : user.email,
        address: data.address ?? user.address,
        gender: data.gender ?? user.gender,
        phoneNumber: data.phoneNumber ?? user.phoneNumber,
        isEmailVerified,
        emailVerificationToken,
      },
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
      }
    });

    return { user: updatedUser };
  },

  async deleteProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        deviceSessions: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Forceful wipe: Delete user and all cascaded data (sessions, records, etc.)
    // Note: In a production environment with financial records, we might anonymize instead,
    // but the request is for a "forceful wipe" of personal profile data.
    await prisma.user.delete({
      where: { id: userId }
    });

    return { message: 'Profile and associated data wiped successfully' };
  },
};
