import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneRoot = path.join(webRoot, '.next', 'standalone');
const serverEntry = path.join(standaloneRoot, 'apps', 'web', 'server.js');

if (!existsSync(serverEntry)) {
  console.error('Missing standalone build. Run `pnpm build` (or `pnpm --filter @techwin/web build`) first.');
  process.exit(1);
}

const staticTarget = path.join(standaloneRoot, 'apps', 'web', '.next', 'static');
if (!existsSync(staticTarget)) {
  cpSync(path.join(webRoot, '.next', 'static'), staticTarget, { recursive: true });
}

const publicTarget = path.join(standaloneRoot, 'apps', 'web', 'public');
if (!existsSync(publicTarget) && existsSync(path.join(webRoot, 'public'))) {
  cpSync(path.join(webRoot, 'public'), publicTarget, { recursive: true });
}

const port = process.env.PORT ?? '3000';
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const child = spawn(process.execPath, [serverEntry], {
  cwd: standaloneRoot,
  env: { ...process.env, PORT: port, HOSTNAME: hostname, NODE_ENV: 'production' },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
