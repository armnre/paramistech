'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { adminCopy as c } from '@/content/admin';
import { can, type Permission, type Role } from '@/lib/permissions';
import { slugify } from '@/lib/slug';
import { LogoutButton } from '@/components/admin-login';

const links: ReadonlyArray<readonly [string, string, Permission]> = [
  ['/admin', c.dashboard, 'account:manage'],
  ['/admin/leads', c.inbox, 'leads:read'],
  ['/admin/services', c.services, 'content:write'],
  ['/admin/projects', c.projects, 'content:write'],
  ['/admin/posts', c.posts, 'content:write'],
  ['/admin/faqs', c.faqs, 'content:write'],
  ['/admin/media', c.media, 'content:write'],
  ['/admin/settings', c.settings, 'settings:write'],
  ['/admin/users', c.users, 'users:manage'],
  ['/admin/audit', c.audit, 'audit:read'],
  ['/admin/account', c.account, 'account:manage'],
];

// The server enforces every permission; hiding links here is only a convenience.
export function AdminShell({ email, role, children }: { email: string; role: Role; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-nav" aria-label="مدیریت">
        <strong>{c.title}</strong>
        <nav>
          {links.filter(([, , permission]) => can(role, permission)).map(([href, label]) => (
            <Link key={href} href={href} className={path === href || (href !== '/admin' && path.startsWith(href)) ? 'active' : ''}>{label}</Link>
          ))}
        </nav>
        <LogoutButton />
        <small>{email} · {c.roles[role]}</small>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}

export function AdminForm({ action, children }: { action: (form: FormData) => Promise<void>; children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return <form className="card form-card" action={action} onChange={() => setDirty(true)}>{children}</form>;
}

export function SlugField({
  name = 'slug',
  label = c.slug,
  titleField = 'title',
  defaultValue = '',
  required = true,
}: {
  name?: string;
  label?: string;
  titleField?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="slug-row">
        <input id={name} name={name} dir="ltr" value={value} onChange={(event) => setValue(event.target.value)} required={required} />
        <button
          type="button"
          className="btn btn-outline"
          onClick={(event) => {
            const form = event.currentTarget.form;
            const title = form?.querySelector<HTMLInputElement>(`[name="${titleField}"]`)?.value || '';
            setValue(slugify(title));
          }}
        >
          {c.suggest}
        </button>
      </div>
    </div>
  );
}

/** Visually and semantically separate block for the English translation of a record (LTR inputs). */
export function EnglishSection({ children }: { children: ReactNode }) {
  return (
    <fieldset className="english-section" lang="en" dir="ltr">
      <legend>{c.englishLegend}</legend>
      <p className="english-hint" dir="rtl" lang="fa">{c.englishHint}</p>
      {children}
    </fieldset>
  );
}

export function MarkdownField({ name, label, defaultValue = '', dir }: { name: string; label: string; defaultValue?: string; dir?: 'ltr' | 'rtl' }) {
  const [value, setValue] = useState(defaultValue);
  const [html, setHtml] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: value }),
      });
      if (response.ok) setHtml((await response.json()).html);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value]);
  return (
    <div className="field markdown-editor">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} dir={dir} value={value} onChange={(event) => setValue(event.target.value)} />
      <div className="markdown" dir={dir} aria-label={c.preview} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function DeleteForm({ action, id }: { action: (form: FormData) => Promise<void>; id: number }) {
  return (
    <form action={action} onSubmit={(event: FormEvent<HTMLFormElement>) => { if (!confirm(c.confirmDelete)) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-outline" type="submit">{c.remove}</button>
    </form>
  );
}
