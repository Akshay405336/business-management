/**
 * Reports organization-member sign-in accounts that no longer belong to anything and,
 * with --apply, permanently deletes them.
 *
 * An account is an orphan only when ALL of these hold:
 *   - role ORGANIZATION_MEMBER (platform super admins are never touched)
 *   - no organization membership in any organization
 *   - no linked employee record
 *   - no row in any business table references it (every foreign key to platform_admins,
 *     discovered from the catalog, except its own sessions, challenges and audit trail)
 * Accounts without an employee but with a membership are legitimate members created from
 * Users; they are listed for review and never deleted.
 *
 * Usage: node prisma/scripts/orphaned-member-accounts.mjs [--apply]
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

const apply = process.argv.includes('--apply');
// The account's own credentials and audit trail; audit rows keep the event with a null actor.
const OWN_TABLES = new Set([
  'platform_sessions',
  'platform_auth_challenges',
  'platform_audit_events',
  'crm_audit_events',
  'organization_memberships',
]);

const client = new pg.Client({ connectionString: url });
await client.connect();

const foreignKeys = (
  await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'platform_admins'
  `)
).rows.filter((fk) => !OWN_TABLES.has(fk.table_name));

async function businessReferences(db, adminId) {
  const refs = {};
  for (const fk of foreignKeys) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM "${fk.table_name}" WHERE "${fk.column_name}" = $1`,
      [adminId],
    );
    if (rows[0].n > 0) refs[`${fk.table_name}.${fk.column_name}`] = rows[0].n;
  }
  return refs;
}

const candidates = (
  await client.query(`
    SELECT a.id, a.email, a.status, a.created_at, a.last_login_at,
      (SELECT count(*)::int FROM organization_memberships m WHERE m.admin_id = a.id) AS memberships
    FROM platform_admins a
    WHERE a.role = 'ORGANIZATION_MEMBER'
      AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.platform_admin_id = a.id)
    ORDER BY a.created_at
  `)
).rows;

const orphans = [];
for (const account of candidates) {
  const refs = await businessReferences(client, account.id);
  const orphan = account.memberships === 0 && Object.keys(refs).length === 0;
  console.log(
    `${orphan ? 'ORPHAN  ' : 'KEEP    '} ${account.email} (${account.id}) status=${account.status} ` +
      `memberships=${account.memberships} references=${JSON.stringify(refs)}`,
  );
  if (orphan) orphans.push(account);
}

console.log(
  `\n${candidates.length} member account(s) without an employee record; ${orphans.length} orphan(s).`,
);

if (!apply) {
  if (orphans.length > 0) console.log('Dry run only. Re-run with --apply to delete the orphans listed above.');
  await client.end();
  process.exit(0);
}

let deleted = 0;
for (const account of orphans) {
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT id FROM platform_admins
       WHERE id = $1 AND role = 'ORGANIZATION_MEMBER'
         AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.platform_admin_id = platform_admins.id)
         AND NOT EXISTS (SELECT 1 FROM organization_memberships m WHERE m.admin_id = platform_admins.id)
       FOR UPDATE`,
      [account.id],
    );
    const stillOrphan =
      locked.rowCount === 1 &&
      Object.keys(await businessReferences(client, account.id)).length === 0;
    if (!stillOrphan) {
      await client.query('ROLLBACK');
      console.log(`SKIPPED  ${account.email}: no longer an orphan`);
      continue;
    }
    // Sessions, refresh tokens and challenges cascade; audit rows keep the event with a null actor.
    await client.query('DELETE FROM platform_admins WHERE id = $1', [account.id]);
    await client.query('COMMIT');
    deleted += 1;
    console.log(`DELETED  ${account.email}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(`FAILED   ${account.email}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`Deleted ${deleted} orphaned account(s).`);
await client.end();
