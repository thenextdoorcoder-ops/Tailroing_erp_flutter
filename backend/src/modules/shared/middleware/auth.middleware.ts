import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env';
import { sessionService } from '../../auth/session.service';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    ownerId: string;
    phoneNumber?: string;
  };
}

export const authenticateToken = async (req: any, res: any, next: any) => {
  let token = null;

  // Check Authorization header first (Priority)
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Fallback to cookie if no header token
  if (!token && req.cookies.token) {
    token = req.cookies.token;
  }

  // Fallback to query parameter — ONLY for direct PDF downloads, not general API use.
  // JWTs in URLs are logged by servers and visible in browser history/referer headers.
  if (!token && req.query.token && (req.path.includes('/pdf') || req.originalUrl.includes('/pdf'))) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, config.jwtSecret!);
    req.user = decoded;

    // ── Inactivity check for session-based tokens (OTP / device sessions) ──
    if (decoded.deviceId && decoded.id) {
      const active = await sessionService.isSessionActive(decoded.id, decoded.deviceId);
      if (!active) {
        return res.status(401).json({
          error: 'Session expired due to inactivity. Please log in again.',
          code: 'SESSION_EXPIRED',
        });
      }
      // Slide the inactivity window — fire and forget (doesn't block the request)
      sessionService.touchSession(decoded.id, decoded.deviceId).catch(() => { });
    }

    next();
  } catch (error: any) {
    console.error('Token verification failed:', error);
    // Use 401 (not 403) so the frontend checkAuth() can detect expiry
    // and automatically clear localStorage + redirect to the login page.
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional auth — populates req.user if a valid token is present, but does NOT block the request.
 * Use on routes that serve both guests and authenticated users.
 */
export const optionalAuth = async (req: any, _res: any, next: any) => {
  let token: string | null = null;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  if (token) {
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret!);
      req.user = decoded;
    } catch {
      // Invalid/expired token — proceed as guest
    }
  }
  next();
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};
