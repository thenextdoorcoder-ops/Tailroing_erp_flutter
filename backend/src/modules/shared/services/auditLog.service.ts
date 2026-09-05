import prisma from '../../../lib/prisma';

export const auditLogService = {
  async log(params: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: object;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          changes: params.changes as any,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      console.error('[AuditLog] Failed to write:', err);
    }
  },
};
