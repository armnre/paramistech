// Run the billing cycle once (issue due invoices, mark overdue):  npm run billing
import './env';
import { pool } from 'zitejs/db';
import { runBillingCycle } from '../../../apps/paramistech/src/server/lib';
console.log(await runBillingCycle());
await pool.end();
