#!/usr/bin/env node
// Local development only: creates (or refreshes) the demo super admin, so a demo needs one account instead of two.
// A super admin is an admin who may also approve their own work; the approval is still recorded as theirs.
// Runs as part of `pnpm db:seed`. Safe to run again: an existing account gets its role and password back.
//   pnpm db:seed:demo
// Change the login with DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const email = process.env.DEMO_ADMIN_EMAIL ?? 'superadmin@edulaunch.test';
const password = process.env.DEMO_ADMIN_PASSWORD ?? 'EduLaunch@2026';

let status;
try {
  status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch {
  console.error('Supabase is not running. Start it with `pnpm db:start`, then run this again.');
  process.exit(1);
}
const api = status.API_URL;
// The service key never leaves this machine, and this script refuses to touch anything but the local Supabase.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(api)) {
  console.error(`Refusing to create a demo account outside local development (${api}).`);
  process.exit(1);
}
const key = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const account = {
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Super Admin' },
  app_metadata: { role: 'admin', super_admin: true },
};

const created = await fetch(`${api}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify(account) });
if (!created.ok) {
  // Already there: find it and set the role and password again.
  const list = await (await fetch(`${api}/auth/v1/admin/users?per_page=1000`, { headers })).json();
  const user = list.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`Could not create ${email}: ${await created.text()}`);
    process.exit(1);
  }
  const updated = await fetch(`${api}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ password, email_confirm: true, app_metadata: { ...user.app_metadata, ...account.app_metadata } }),
  });
  if (!updated.ok) {
    console.error(`Could not update ${email}: ${await updated.text()}`);
    process.exit(1);
  }
}
console.log(`Demo super admin ready: ${email} / ${password}  (local only)`);
