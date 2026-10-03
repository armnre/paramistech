import { describe, expect, it } from 'vitest';
import { can, isRole, type Permission } from './permissions';

const all: Permission[] = [
  'content:write',
  'leads:read',
  'leads:update',
  'leads:delete',
  'leads:export',
  'settings:write',
  'users:manage',
  'audit:read',
  'account:manage',
];

describe('role permissions', () => {
  it('lets admins do everything', () => {
    for (const permission of all) expect(can('admin', permission)).toBe(true);
  });

  it('lets editors manage content and work leads, nothing else', () => {
    expect(all.filter((permission) => can('editor', permission))).toEqual([
      'content:write',
      'leads:read',
      'leads:update',
      'account:manage',
    ]);
    expect(can('editor', 'leads:delete')).toBe(false);
    expect(can('editor', 'leads:export')).toBe(false);
    expect(can('editor', 'settings:write')).toBe(false);
    expect(can('editor', 'users:manage')).toBe(false);
    expect(can('editor', 'audit:read')).toBe(false);
  });

  it('denies unknown roles', () => {
    for (const permission of all) expect(can('visitor', permission)).toBe(false);
    expect(isRole('admin')).toBe(true);
    expect(isRole('root')).toBe(false);
  });
});
