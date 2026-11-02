# Backup and recovery

Operational guidance for Techwin production data. **This repository does not configure automated backups** — you must set them up in PostgreSQL hosting, object storage, Redis, and secret management (Coolify, cloud provider, or ops tooling).

## PostgreSQL

### What to back up

- Full database cluster or single `techwin` database containing all tenant data, auth, CRM, projects, WhatsApp state, and media metadata.

### Recommended approach

- **Managed Postgres:** enable automated daily snapshots and point-in-time recovery (PITR) if offered.
- **Self-hosted:** `pg_dump` / `pg_basebackup` on a schedule; store dumps off-site with encryption.

### Restore verification

Periodically restore a backup to a **non-production** instance and run:

- `pnpm db:migrate:status` (or `prisma migrate status`) — applied migrations should match release
- Smoke login and one read per critical module

Never run restore experiments against production unless executing a real incident recovery.

### Migration rollback limitations

- Production deploys use **`prisma migrate deploy`** (forward-only).
- Rolling back **application** code does not revert schema. If a migration already applied, older API binaries may fail against the new schema.
- Recovery options: restore DB to pre-migration snapshot, or ship a **new forward migration** that fixes the issue.

## Object storage (S3)

- Employee profile images and WhatsApp media references live in S3 (production default).
- Enable **bucket versioning** and/or cross-region replication if your RPO/RTO requires it.
- IAM policies should restrict public access; Techwin serves private objects via presigned URLs (see [STORAGE.md](./STORAGE.md)).
- **`storage_cleanup_jobs`:** failed deletes retry via background worker; after permanent failure, metadata may be gone while objects remain — ops may need manual S3 lifecycle review.

## Redis

- Used for cache, rate limits, locks, and ephemeral coordination — **not the system of record**.
- Default Techwin usage does not require Redis backup for business data recovery.
- If you enable Redis persistence (AOF/RDB) for ops reasons, document restore procedure with your provider; expect cold-cache behavior after restore (permission cache rebuild, no data loss in Postgres).

## Environment secrets

Back up securely (password manager, Coolify secret store, vault):

- `JWT_ACCESS_SECRET`
- `TOTP_ENCRYPTION_KEY` (+ previous keys if rotating)
- `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY` (+ previous keys)
- Database and Redis URLs
- S3 credentials
- Meta app secret

Loss of **TOTP** or **WhatsApp encryption** keys without previous keys can make existing encrypted data unrecoverable.

## Recovery order after major failure

1. Restore **PostgreSQL** to a known-good point (before bad migration if applicable).
2. Restore or verify **S3** bucket contents if media loss occurred.
3. Redeploy **Redis** (empty is acceptable) or restore from snapshot if you rely on persisted Redis.
4. Apply **`migrate deploy`** if restored DB is behind current release migrations.
5. Deploy **API** with correct env secrets and `TRUST_PROXY` / HTTPS origins.
6. Deploy **web** with correct `API_INTERNAL_URL`.
7. Verify **`/api/v1/ready`**, login, and critical workflows.
8. Re-run Super Admin sync **only** if intentionally resetting platform admin credentials (`synchronize-super-admin.js` / seed).

## Manual infrastructure (Coolify / cloud)

Configure outside this repo:

- Automated Postgres backups and retention
- S3 versioning/replication and lifecycle rules
- TLS certificates for admin and webhook URLs
- Log retention and alerting on API stdout
- Secret rotation procedures

## What this project does not provide

- Backup cron jobs or scripts targeting production
- Disaster recovery automation
- Multi-region failover

Those remain **manual deployment requirements** (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
