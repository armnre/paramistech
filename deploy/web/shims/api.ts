/* eslint-disable @typescript-eslint/no-explicit-any */
// Standalone replacement for "zitejs/api": each endpoint is POST /api/<name> with { input }.
async function call(name: string, input: unknown): Promise<any> {
  const res = await fetch(`/api/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: input ?? {} }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(json?.error?.message || 'ارتباط با سرور برقرار نشد.');
    err.code = json?.error?.code || (res.status === 401 ? 'UNAUTHORIZED' : undefined);
    err.userFacingMessage = err.message;
    throw err;
  }
  return json.data;
}
export const siteContent = (i: any = {}) => call('siteContent', i);
export const submitRequest = (i: any) => call('submitRequest', i);
export const portal = (i: any) => call('portal', i);
export const adminAuth = (i: any) => call('adminAuth', i);
export const adminCrud = (i: any) => call('adminCrud', i);
export const adminFinance = (i: any) => call('adminFinance', i);

export type SiteContentInputType = any; export type SiteContentOutputType = any;
export type SubmitRequestInputType = any; export type SubmitRequestOutputType = any;
export type PortalInputType = any; export type PortalOutputType = any;
export type AdminAuthInputType = any; export type AdminAuthOutputType = any;
export type AdminCrudInputType = any; export type AdminCrudOutputType = any;
export type AdminFinanceInputType = any; export type AdminFinanceOutputType = any;
