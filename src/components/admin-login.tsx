'use client';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminCopy as c } from '@/content/admin';

/** The login route redirects with one of these codes; free text is never rendered from the URL. */
const messages: Record<string, string> = {
  invalid: c.invalid,
  limited: c.limited,
};

export function AdminLogin() {
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const urlError = messages[params.get('error') ?? ''] ?? '';
  const shown = error || urlError;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!response.ok) {
        const body: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(body.error || c.invalid);
      }
      // A real navigation, not router.refresh(): the session cookie has to be visible to the next
      // document request, and this still works behind proxies that rewrite client-side RSC fetches.
      window.location.assign('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : c.invalid);
      setPending(false);
    }
  }

  return (
    <main className="admin-auth">
      <div className="card form-card" style={{ width: 'min(100%,420px)' }}>
        <h1>{c.login}</h1>
        {shown && <p className="notice error" role="alert">{shown}</p>}
        {/* action/method are the no-JavaScript path: the browser posts the form and follows the redirect. */}
        <form onSubmit={submit} action="/api/admin/login" method="post">
          <div className="field">
            <label htmlFor="admin-email">{c.email}</label>
            <input type="email" id="admin-email" name="email" autoComplete="username" dir="ltr" required />
          </div>
          <div className="field">
            <label htmlFor="admin-password">{c.password}</label>
            <input type="password" id="admin-password" name="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pending}>{c.submit}</button>
        </form>
      </div>
    </main>
  );
}

export function LogoutButton() {
  // Same reasoning as the login form: a native post keeps signing out working without JavaScript.
  return (
    <form action="/api/admin/logout" method="post">
      <button className="btn btn-outline" type="submit">{c.logout}</button>
    </form>
  );
}
