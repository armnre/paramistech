export const roles = ['admin', 'editor'] as const;
export type Role = (typeof roles)[number];

export type Permission =
  | 'content:write' // services, projects, posts, faqs, media
  | 'leads:read'
  | 'leads:update' // status and notes
  | 'leads:delete'
  | 'leads:export'
  | 'settings:write'
  | 'users:manage'
  | 'audit:read'
  | 'account:manage'; // own password and sessions

const editorPermissions: ReadonlySet<Permission> = new Set<Permission>([
  'content:write',
  'leads:read',
  'leads:update',
  'account:manage',
]);

export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export function can(role: string, permission: Permission) {
  if (role === 'admin') return true;
  if (role === 'editor') return editorPermissions.has(permission);
  return false;
}
