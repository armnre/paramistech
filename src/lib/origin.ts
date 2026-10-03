export type OriginCheckInput = {
  origin: string | null;
  host: string | null;
  forwardedHost: string | null;
  siteUrl: string | undefined;
  trustProxy: boolean;
  nodeEnv?: string;
};

function hostOf(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.host : null;
  } catch {
    return null;
  }
}

export function allowedHosts(input: Omit<OriginCheckInput, 'origin'>) {
  const hosts = new Set<string>();
  const siteHost = hostOf(input.siteUrl);
  if (siteHost) hosts.add(siteHost);

  if (input.trustProxy) {
    if (input.host) hosts.add(input.host);
    const forwarded = input.forwardedHost?.split(',')[0]?.trim();
    if (forwarded) hosts.add(forwarded);
  }

  // Convenience for `next dev` only: without a configured site URL there is nothing to compare to.
  if (!siteHost && input.nodeEnv !== 'production' && input.host) hosts.add(input.host);
  return hosts;
}

/** Mutations must carry an Origin header whose host is explicitly allowed. */
export function isAllowedOrigin(input: OriginCheckInput) {
  if (!input.origin) return false;
  const originHost = hostOf(input.origin);
  if (!originHost) return false;
  return allowedHosts(input).has(originHost);
}

export function requestOriginAllowed(headers: { get(name: string): string | null }) {
  return isAllowedOrigin({
    origin: headers.get('origin'),
    host: headers.get('host'),
    forwardedHost: headers.get('x-forwarded-host'),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    trustProxy: process.env.TRUST_PROXY === 'true',
    nodeEnv: process.env.NODE_ENV,
  });
}
