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

const locks = await client.query(`
  SELECT l.pid, l.granted, a.application_name, a.state, LEFT(a.query, 120) AS query_preview
  FROM pg_locks l
  JOIN pg_stat_activity a ON a.pid = l.pid
  WHERE l.locktype = 'advisory'
  ORDER BY l.granted DESC, l.pid
`);
console.log('ADVISORY_LOCKS:', JSON.stringify(locks.rows, null, 2));

const migrations = await client.query(`
  SELECT migration_name, finished_at
  FROM "_prisma_migrations"
  ORDER BY finished_at DESC NULLS LAST
  LIMIT 8
`);
console.log('RECENT_MIGRATIONS:', JSON.stringify(migrations.rows, null, 2));

await client.end();
