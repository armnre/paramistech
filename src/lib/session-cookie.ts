import { ABSOLUTE_MS } from '@/lib/session-policy';

export type SessionSameSite = 'strict' | 'lax' | 'none';

/**
 * SameSite=Strict is the right default, but browsers refuse to STORE a Strict/Lax cookie that arrives
 * from a cross-site context - which is exactly what an embedded preview (an iframe on another site) is.
 * There the login appears to "just refresh": the cookie is dropped, so the panel still sees an
 * anonymous visitor. Set SESSION_COOKIE_SAMESITE=none for such deployments; SameSite=None requires
 * Secure and is only honoured by browsers that allow third-party cookies (Safari blocks them).
 * CSRF stays covered because every mutation re-checks the Origin server-side (`src/lib/origin.ts`).
 */
export function sessionSameSite(env: NodeJS.ProcessEnv = process.env): SessionSameSite {
  const value = (env.SESSION_COOKIE_SAMESITE ?? 'strict').trim().toLowerCase();
  return value === 'none' || value === 'lax' ? value : 'strict';
}

/** Secure cookies only make sense (and only work in Safari) when the site is served over https. */
export function isSecureDeployment(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === 'production' && (env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
}

export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  const sameSite = sessionSameSite(env);
  return {
    httpOnly: true,
    // SameSite=None is rejected by browsers unless the cookie is also Secure.
    secure: sameSite === 'none' ? true : isSecureDeployment(env),
    sameSite,
    path: '/',
    maxAge: Math.floor(ABSOLUTE_MS / 1000),
  };
}
