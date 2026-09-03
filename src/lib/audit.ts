/**
 * Best-effort audit trail for staff actions (cancellations, deletes, etc.).
 *
 * Never throws — a logging failure must not break the action it describes.
 * Failures are reported via the structured logger instead.
 *
 * Usage:
 *   await audit({
 *     salonId: salon.id,
 *     actorUserId,
 *     action: 'booking.cancelled',
 *     resourceType: 'booking',
 *     resourceId: booking.id,
 *   });
 */

import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import type { Prisma } from '@/generated/prisma/client';

interface AuditEntry {
  salonId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        salonId: entry.salonId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        actorUserId: entry.actorUserId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    log.error({ err, entry }, 'audit log write failed');
  }
}
