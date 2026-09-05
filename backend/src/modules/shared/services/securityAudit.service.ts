import prisma from '../../../lib/prisma';

type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'OTP_FAILED'
  | 'GOOGLE_LOGIN_SUCCESS'
  | 'GOOGLE_LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS';

/**
 * Logs a security-relevant authentication event to the `security_audit_logs` table.
 * This is intentionally fire-and-forget — it must NEVER throw and block the auth flow.
 */
export const securityAuditService = {
  async logAuthEvent(params: {
    event: SecurityEventType;
    status: 'SUCCESS' | 'FAILURE';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await prisma.securityAuditLog.create({
        data: {
          event: params.event,
          status: params.status,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata as any,
        },
      });
    } catch (err) {
      // Never block the auth request if logging fails
      console.error('[SecurityAudit] Failed to write auth event:', err);
    }
  },
};
