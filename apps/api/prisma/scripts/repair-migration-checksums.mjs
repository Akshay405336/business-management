import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const prismaDir = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const apiDir = join(prismaDir, '..');
for (const envPath of [
  join(apiDir, '.env'),
  join(apiDir, '..', '..', '.env'),
]) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    break;
  }
}
const root = prismaDir;

const migrationsDir = join(root, 'migrations');
const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: node repair-migration-checksums.mjs <migration_folder_name> ...');
  process.exit(1);
}

function checksumForMigration(name) {
  const file = join(migrationsDir, name, 'migration.sql');
  const content = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(content).digest('hex');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const name of names) {
  const checksum = checksumForMigration(name);
  const result = await client.query(
    'UPDATE "_prisma_migrations" SET checksum = $1 WHERE migration_name = $2',
    [checksum, name],
  );
  console.log(`${name}: checksum=${checksum} (rows updated: ${result.rowCount})`);
}

await client.end();
