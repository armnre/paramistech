import { lt } from 'drizzle-orm';
import { db } from '@/db';
import { adminLoginAttempts, leadAttempts, sessions } from '@/db/schema';
import { attemptRetentionCutoff } from '@/lib/request-security';

/** Runs opportunistically on login and lead submissions: old attempt rows and expired sessions. */
export async function cleanupOldAttempts(now = new Date()) {
  const cutoff = attemptRetentionCutoff(now);
  await db.delete(leadAttempts).where(lt(leadAttempts.createdAt, cutoff));
  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.createdAt, cutoff));
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
