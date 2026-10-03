import { headers } from 'next/headers';
import { getStaff } from '@/lib/auth';
import { requestOriginAllowed } from '@/lib/origin';
import { can, type Permission } from '@/lib/permissions';

/**
 * Guard for every admin server action: strict Origin check, valid session, then the role's permission.
 * The checks run on the server for each call, regardless of which links the UI shows.
 */
export async function assertMutation(permission: Permission) {
  const headerStore = await headers();
  if (!requestOriginAllowed(headerStore)) throw new Error('Forbidden');
  const user = await getStaff();
  if (!user) throw new Error('Unauthorized');
  if (!can(user.role, permission)) throw new Error('Forbidden');
  return user;
}
