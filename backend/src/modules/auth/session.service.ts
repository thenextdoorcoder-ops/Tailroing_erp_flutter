import { v4 as uuidv4 } from 'uuid';
import prisma from '../../lib/prisma';
import { tokenService } from './token.service';

// ─────────────────────────────────────────────────────────────
// Session expiry & inactivity config
// ─────────────────────────────────────────────────────────────
const SESSION_EXPIRY_DAYS = 10;                    // Absolute max session lifetime
export const INACTIVITY_LIMIT_DAYS = 10;           // Logout if idle for this many days
const INACTIVITY_LIMIT_MS = INACTIVITY_LIMIT_DAYS * 24 * 60 * 60 * 1000;

export interface UserForToken {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  ownerId: string | null;
}

export const sessionService = {
  async createSession(
    user: UserForToken,
    options?: {
      deviceId?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ) {
    const deviceId = options?.deviceId || uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    await prisma.deviceSession.upsert({
      where: {
        userId_deviceId: { userId: user.id, deviceId },
      },
      create: {
        userId: user.id,
        deviceId,
        userAgent: options?.userAgent,
        ipAddress: options?.ipAddress,
        expiresAt,
        lastActiveAt: now,
      },
      update: {
        lastActiveAt: now,
        expiresAt,
        userAgent: options?.userAgent,
        ipAddress: options?.ipAddress,
      },
    });

    const token = tokenService.generateAccessToken({
      id: user.id,
      email: user.email || user.phoneNumber || '',
      phoneNumber: user.phoneNumber || undefined,
      role: user.role,
      ownerId: user.ownerId || user.id,
      deviceId,
    });

    return { token, deviceId };
  },

  /**
   * Touch lastActiveAt for a session — call this on every authenticated request.
   * Only updates the DB once per hour to avoid write amplification.
   */
  async touchSession(userId: string, deviceId: string): Promise<void> {
    try {
      const session = await prisma.deviceSession.findUnique({
        where: { userId_deviceId: { userId, deviceId } },
        select: { lastActiveAt: true },
      });
      if (!session) return;

      // Throttle: only write if last touch was > 30 minutes ago
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (!session.lastActiveAt || session.lastActiveAt < thirtyMinutesAgo) {
        await prisma.deviceSession.update({
          where: { userId_deviceId: { userId, deviceId } },
          data: { lastActiveAt: new Date() },
        });
      }
    } catch {
      // Non-critical — don't throw
    }
  },

  /**
   * Check whether a session is still active (not idle for > INACTIVITY_LIMIT_DAYS).
   * Returns false if session is expired or doesn't exist.
   */
  async isSessionActive(userId: string, deviceId: string): Promise<boolean> {
    try {
      const session = await prisma.deviceSession.findUnique({
        where: { userId_deviceId: { userId, deviceId } },
        select: { lastActiveAt: true, expiresAt: true },
      });
      if (!session) return false;
      if (session.expiresAt < new Date()) return false;
      if (session.lastActiveAt) {
        const idleMs = Date.now() - session.lastActiveAt.getTime();
        if (idleMs > INACTIVITY_LIMIT_MS) return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async invalidateSession(userId: string, deviceId?: string) {
    if (deviceId) {
      await prisma.deviceSession.deleteMany({
        where: { userId, deviceId },
      });
    } else {
      await prisma.deviceSession.deleteMany({ where: { userId } });
    }
  },
};
