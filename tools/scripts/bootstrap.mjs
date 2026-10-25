#!/usr/bin/env node
// One command to get a working local EduLaunch. Safe to run again at any time.
//   node tools/scripts/bootstrap.mjs          set everything up
//   node tools/scripts/bootstrap.mjs --check  only check the tools you need
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const checkOnly = process.argv.includes('--check');
// Windows runs pnpm/npm as .cmd files, which need a shell.
const shell = process.platform === 'win32';
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const run = (cmd, args, opts = {}) => {
  console.log(`\n${bold('›')} ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell, ...opts });
  if (r.status !== 0) {
    console.error(red(`\n✗ "${cmd} ${args.join(' ')}" failed. Fix the error above and run this script again.`));
    process.exit(1);
  }
};
const output = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell }).trim();
  } catch {
    return null;
  }
};
const atLeast = (have, want) => {
  const [a, b] = [have, want].map((v) => v.replace(/^v/, '').split('.').map(Number));
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return true;
};

// 1. Prerequisites
const wantNode = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
const checks = [
  { name: `Node.js ≥ ${wantNode}`, ok: atLeast(process.version, wantNode), have: process.version, fix: `nvm install ${wantNode}  (or: brew upgrade node / https://nodejs.org)` },
  { name: 'pnpm', ok: !!output('pnpm', ['-v']), have: output('pnpm', ['-v']), fix: 'npm install -g pnpm' },
  { name: 'Docker running', ok: !!output('docker', ['info', '--format', '{{.ServerVersion}}']), have: output('docker', ['--version']), fix: 'Install Docker Desktop (https://www.docker.com/products/docker-desktop) and open it' },
  { name: 'Supabase CLI', ok: !!output('supabase', ['--version']), have: output('supabase', ['--version']), fix: 'brew install supabase/tap/supabase  (Windows: scoop install supabase)' },
  { name: 'uv (Python)', ok: !!output('uv', ['--version']), have: output('uv', ['--version']), fix: 'curl -LsSf https://astral.sh/uv/install.sh | sh  (Windows: winget install astral-sh.uv)' },
];
console.log(bold('Checking tools'));
for (const c of checks) console.log(`  ${c.ok ? green('✓') : red('✗')} ${c.name}${c.have ? `  (${c.have})` : ''}${c.ok ? '' : `\n      → ${c.fix}`}`);
if (checks.some((c) => !c.ok)) {
  console.error(red('\nInstall the missing tools above, then run this script again.'));
  process.exit(1);
}
if (checkOnly) process.exit(0);

// 2. Dependencies, database, message broker, schemas
run('pnpm', ['install']);
run('uv', ['sync'], { cwd: join(root, 'services/content') });
if (!output('supabase', ['status', '-o', 'json'])) run('supabase', ['start']);
run('node', ['tools/scripts/setup-env.mjs']);
run('docker', ['compose', '-f', 'infra/docker/compose.yml', 'up', '-d', '--wait']);
run('pnpm', ['db:migrate'], { env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' } });
run('pnpm', ['turbo', 'run', 'build', '--filter=./packages/*'], { env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' } });

console.log(`
${green('✓ EduLaunch is ready.')}

  Start everything:   ${bold('pnpm dev')}
  Website:            http://localhost:3000
  API gateway:        http://localhost:4000/health
  Supabase Studio:    http://127.0.0.1:54323   (database browser)
  Emails (sign-up):   http://127.0.0.1:54324   (local inbox)
  RabbitMQ:           http://127.0.0.1:15672   (user/password in infra/docker/.env)
`);
