#!/usr/bin/env node
// Local development only: gives an existing account the admin role (Supabase app_metadata.role = "admin").
// Users cannot set app_metadata themselves, so this is the only way to get an admin locally.
// Sign up in the web app first, then:
//   pnpm admin:grant name@contoh.com            (log out and in again to see the admin console)
//   pnpm admin:grant name@contoh.com --super    (a super admin: may also approve their own work)
//   pnpm admin:grant name@contoh.com --revoke   (back to a student)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const [email, flag] = process.argv.slice(2);
if (!email || !/^[^\s'@]+@[^\s'@]+$/.test(email)) {
  console.error('Usage: pnpm admin:grant <email> [--super | --revoke]');
  process.exit(1);
}

const dbContainer = `supabase_db_${readFileSync(join(root, 'supabase/config.toml'), 'utf8').match(/project_id = "(.+)"/)[1]}`;
const change =
  flag === '--revoke'
    ? `raw_app_meta_data - 'role' - 'super_admin'`
    : `raw_app_meta_data || '{"role":"admin","super_admin":${flag === '--super'}}'`;
// The e-mail pattern above rules out quotes, so it is safe inside the SQL string.
const sql = `update auth.users set raw_app_meta_data = ${change} where lower(email) = lower('${email}') returning email`;
const out = execFileSync('docker', ['exec', dbContainer, 'psql', '-U', 'postgres', '-tA', '-c', sql], { encoding: 'utf8' }).trim();

if (!out.includes('@')) {
  console.error(`No account with the e-mail ${email}. Sign up in the web app first.`);
  process.exit(1);
}
console.log(
  flag === '--revoke' ? `${email} is a student again.` : `${email} is now ${flag === '--super' ? 'a super admin' : 'an admin'}. Log out and log in again to open the admin console.`,
);
