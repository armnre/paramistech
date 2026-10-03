import 'server-only';
import { db } from '@/db';
import { auditLog } from '@/db/schema';

/** Audit failures are logged but never break the action being audited. */
export async function writeAudit(
  userId: number | null,
  action: string,
  entity: string,
  entityId?: number | string | null,
) {
  try {
    await db.insert(auditLog).values({
      userId,
      action,
      entity,
      entityId: entityId === undefined || entityId === null ? null : String(entityId),
    });
  } catch (error) {
    console.error('Audit log write failed', error);
  }
}
