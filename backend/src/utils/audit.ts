import { prisma } from '../config/db.js';
import { logger } from './logger.js';

interface AuditParams {
  entityType: string;
  entityId: string;
  action: string;
  performedById?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedById: params.performedById || null,
        details: params.details as any || {},
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    logger.error('Failed to record audit log', error, params as unknown as Record<string, unknown>);
  }
}
