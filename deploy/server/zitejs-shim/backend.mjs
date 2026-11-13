// Standalone replacement for "zitejs/backend" — endpoint files run unchanged.
export class ZiteError extends Error {
  constructor(arg = {}, code) {
    const o = typeof arg === 'string' ? { message: arg, code } : arg;
    super(o.userFacingMessage || o.message || 'Error');
    this.code = o.code || 'BAD_REQUEST';
    this.userFacingMessage = o.userFacingMessage;
    this.internal = o.message;
  }
}
export function createEndpoint(def) { return def; }
