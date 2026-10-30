/**
 * Terminates Postgres backends holding Prisma migrate advisory locks.
 * Use when `prisma migrate dev/deploy` fails with P1002.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
for (const envPath of [resolve(here, '../../../.env'), resolve(here, '../../../../.env')]) {
  try {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq);
      let val = trimmed.slice(eq + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === 'DATABASE_URL' && !process.env.DATABASE_URL) process.env.DATABASE_URL = val;
    }
  } catch {
    /* try next path */
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const selfPid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

const blocked = await client.query(`
  SELECT DISTINCT l.pid
  FROM pg_locks l
  WHERE l.locktype = 'advisory'
    AND l.granted = true
    AND l.pid <> $1
`, [selfPid]);

const waiting = await client.query(`
  SELECT DISTINCT l.pid
  FROM pg_locks l
  WHERE l.locktype = 'advisory'
    AND l.granted = false
    AND l.pid <> $1
`, [selfPid]);

const pids = [...new Set([...blocked.rows, ...waiting.rows].map((r) => r.pid))];

if (pids.length === 0) {
  console.log('No other advisory lock holders found.');
  await client.end();
  process.exit(0);
}

for (const pid of pids) {
  const info = await client.query(
    `SELECT application_name, state, LEFT(query, 80) AS q FROM pg_stat_activity WHERE pid = $1`,
    [pid],
  );
  console.log(`Terminating pid ${pid}:`, info.rows[0] ?? {});
  await client.query('SELECT pg_terminate_backend($1)', [pid]);
}

console.log(`Terminated ${pids.length} backend(s). Retry migrate deploy.`);
await client.end();
