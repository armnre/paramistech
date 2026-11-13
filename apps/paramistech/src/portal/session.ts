import { portal, type PortalInputType } from 'zitejs/api';

const KEY = 'pt_portal_token';
export const getToken = () => localStorage.getItem(KEY) ?? '';
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

/** Calls the portal endpoint with the stored session; drops the session when it's rejected. */
export async function call(input: Omit<PortalInputType, 'token'>) {
  try {
    return await portal({ ...input, token: getToken() } as PortalInputType);
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (String(e?.code ?? e?.message).includes('UNAUTHORIZED')) { clearToken(); window.location.reload(); }
    throw e;
  }
}
