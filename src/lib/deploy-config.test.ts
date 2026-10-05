import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the deployment contract that is easy to break silently: the Liara platform target, the
// pre-start migration hook and the uploads disk. A mismatch (e.g. mounting the disk on '/data' while
// the app writes to '<root>/data/uploads') would only show up as lost images on the server.
const root = path.resolve(__dirname, '..', '..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

type Disk = { name: string; mountTo: string };
const liara = JSON.parse(read('liara.json')) as {
  platform: string;
  port: number;
  healthCheck: { command: string };
  disks: Disk[];
};
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>;
  engines?: { node?: string };
};

describe('Liara deployment configuration', () => {
  it('targets the next platform on port 3000', () => {
    expect(liara.platform).toBe('next');
    expect(liara.port).toBe(3000);
  });

  it('mounts the uploads disk on a path relative to the project root that matches the app default', () => {
    const disk = liara.disks.find((entry) => entry.name === 'uploads');
    expect(disk).toBeDefined();
    // The Liara Next platform rejects absolute mount paths.
    expect(disk!.mountTo.startsWith('/')).toBe(false);
    const uploadsSource = read('src/lib/uploads.ts');
    // uploadsDirectory() falls back to path.join(process.cwd(), 'data', 'uploads')
    expect(uploadsSource).toContain("'data'");
    expect(uploadsSource).toContain("'uploads'");
    expect(`${disk!.mountTo}/uploads`).toBe('data/uploads');
    // ...and the documented value in .env.example must agree with the mounted path
    expect(read('.env.example')).toMatch(/UPLOADS_DIR=\W*data\/uploads/);
  });

  it('applies migrations before the server starts', () => {
    expect(pkg.scripts.prestart).toBe('node scripts/prestart.mjs');
    expect(pkg.scripts.start).toBe('next start');
  });

  it('declares a Node version for the build', () => {
    expect(pkg.engines?.node).toBeTruthy();
  });

  it('health-checks the app through the route that exists', () => {
    expect(liara.healthCheck.command).toContain('/api/health');
    expect(() => read('src/app/api/health/route.ts')).not.toThrow();
  });

  it('documents every variable a production deploy cannot start without', () => {
    const env = read('.env.example');
    for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_SITE_URL', 'RATE_LIMIT_SALT', 'UPLOADS_DIR', 'ALLOW_PLACEHOLDERS']) {
      expect(env).toContain(`${key}=`);
    }
  });
});
