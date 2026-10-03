export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_IP_FAILURES = 10; // shared offices/NAT share one IP, so this is looser
export const MAX_EMAIL_FAILURES = 5;

export function isLockedOut(failures: { ip: number; email: number }) {
  return failures.ip >= MAX_IP_FAILURES || failures.email >= MAX_EMAIL_FAILURES;
}
