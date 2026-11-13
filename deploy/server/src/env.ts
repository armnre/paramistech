// Map server env onto the names the app code expects.
if (!process.env.ZITE_ADMIN_SECRET) process.env.ZITE_ADMIN_SECRET = process.env.SESSION_SECRET || '';
if ((process.env.ZITE_ADMIN_SECRET || '').length < 32) throw new Error('SESSION_SECRET (or ZITE_ADMIN_SECRET) must be at least 32 characters');
if (!process.env.ZITE_APP_URL && process.env.SITE_DOMAIN) process.env.ZITE_APP_URL = 'https://' + process.env.SITE_DOMAIN;
export {};
