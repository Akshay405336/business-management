# Production deployment

This document describes how to run the Techwin API and web stack in production (including self-hosted Docker Compose and generic reverse-proxy / [Coolify](https://coolify.io)-style deployments). It does not replace provider-specific runbooks.

## Required services

| Service | Purpose |
|---------|---------|
| **PostgreSQL 16+** | Primary data store |
| **Redis 7+** | Rate limiting, permission cache, distributed job locks, WhatsApp realtime coordination |
| **S3-compatible object storage** | Required in production (`STORAGE_PROVIDER=s3` default when `NODE_ENV=production`) |
| **API** | NestJS (`node dist/main.js`), port **4000** inside container |
| **Web** | Next.js admin UI, port **3000** |

Optional: Meta WhatsApp Cloud API credentials and public HTTPS webhook URL.

## Environment configuration

Copy [.env.example](../.env.example) and set production values. Full reference: [ENVIRONMENT.md](./ENVIRONMENT.md).

Minimum production checklist:

- `NODE_ENV=production`
- `DATABASE_URL`, `REDIS_URL` (use TLS URLs where provider requires)
- `JWT_ACCESS_SECRET` (≥ 48 characters)
- `TOTP_ENCRYPTION_KEY` (unique base64 32-byte key — not the example placeholder)
- `WEB_ORIGIN` (HTTPS admin URL seen by browsers)
- `TRUST_PROXY=1` (or appropriate hop count) when behind Coolify, nginx, or Traefik
- `COOKIE_SECURE=true` (default in production when unset)
- `SWAGGER_ENABLED=false` (default in production when unset)
- `LOG_PRETTY=false`
- S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- WhatsApp (if used): encryption key, Meta app settings, `WHATSAPP_WEBHOOK_BASE_URL` (HTTPS)

Secrets are validated at startup; failures print variable names only.

## Database migrations

**Always use:**

```bash
pnpm db:migrate:deploy
# or inside the API container:
node node_modules/prisma/build/index.js migrate deploy
```

**Never** use `prisma db push` or `prisma migrate dev` against production.

**Never** run `prisma migrate reset` on production data.

### Deployment order (recommended)

1. Build and publish new API (and web) container images.
2. Run **`migrate deploy` once** against the target database (CI job, Coolify pre-deploy command, or one-off container — not every replica).
3. If migration fails, **stop** — do not route traffic to new API versions that require the new schema.
4. Roll out API replicas, then web.
5. Run Super Admin sync only when intentionally changing seed credentials:  
   `node dist/modules/auth/cli/synchronize-super-admin.js` (see README).

The API **does not** run migrations on boot. This avoids races when multiple replicas start simultaneously.

### Connection capacity

Each API process holds up to **`DATABASE_POOL_MAX`** connections (default **10**).

Approximate maximum DB connections:

```text
connections ≈ (API_replicas × DATABASE_POOL_MAX) + admin/migration overhead
```

Example: 3 API replicas × 10 = 30 connections. Set Postgres `max_connections` and pool size accordingly. Do not raise `DATABASE_POOL_MAX` without measuring load and provider limits.

Prisma disconnects on Nest shutdown (`enableShutdownHooks` + `PrismaService.onModuleDestroy`).

## Redis and background workers

Both workers run **inside the same NestJS process** as the HTTP API. There is no separate worker binary in this repository.

| Worker | Env flag | Default | Lock key | Notes |
|--------|----------|---------|----------|-------|
| WhatsApp jobs | `WHATSAPP_WORKER_ENABLED` | `true` | `whatsapp:lock:whatsapp:jobs` | Webhook retry, outbound retry, broadcasts |
| Storage cleanup | `MEDIA_CLEANUP_WORKER_ENABLED` | `true` | `media:lock:storage-cleanup` | Drains `storage_cleanup_jobs` for S3 deletes |

### Single API replica

- Enable both workers (defaults).
- Redis required for readiness (`GET /api/v1/ready`) and normal operation.

### Multiple API replicas

**Recommended:**

1. Run **Redis** reachable by all replicas (required for readiness today).
2. Enable workers on **at least one** replica, **or** enable on all replicas and rely on Redis locks + DB claiming.

**WhatsApp:** Database row claiming makes duplicate ticks mostly safe; the Redis lock reduces redundant work. By default, if Redis `SET` fails, locks are skipped and **every replica may run jobs** (Phase 4B semantics). Set **`DISTRIBUTED_LOCK_STRICT=true`** on all API replicas in multi-replica production so worker ticks are skipped when Redis is unavailable or another replica holds the lock.

**Media cleanup:** Prefer **exactly one** replica with `MEDIA_CLEANUP_WORKER_ENABLED=true` and disable on others to avoid duplicate S3 delete attempts when Redis is unavailable. With healthy Redis, only one holder runs per tick.

**Disabling workers:** Setting `WHATSAPP_WORKER_ENABLED=false` on **all** replicas stops webhook processing and outbound retries — only do this on secondary replicas if at least one primary keeps it `true`.

### Dedicated worker process

Not supported as a separate deployable artifact. To dedicate one container to workers only, you would run the full API image with workers enabled and optionally scale HTTP behind an internal network — out of scope unless you add routing rules externally.

## Health and readiness

| Route | Contract | Use |
|-------|----------|-----|
| `GET /api/v1/health` | `{ status: 'ok', uptimeSeconds }` | **Liveness** — process up |
| `GET /api/v1/ready` | `{ status: 'ready' \| 'not_ready', checks: { database, redis } }` | **Readiness** — Postgres + Redis (503 if down) |

Probes use 2s timeouts. No secrets or config in responses. Health routes are excluded from access logs.

**Docker Compose** uses `/ready` for the API healthcheck so dependent services wait for dependencies.

Configure Coolify / load balancers:

- Liveness → `/api/v1/health`
- Readiness → `/api/v1/ready`

## Docker images

Build context is always the **repository root**:

```bash
docker build -f docker/api/Dockerfile -t techwin-api .
docker build -f docker/web/Dockerfile -t techwin-web .
```

API image:

- Multi-stage build, `pnpm deploy --prod` output as non-root user `techwin`
- `CMD ["node", "dist/main.js"]`
- Includes Prisma CLI under `node_modules` for `migrate deploy`
- Does **not** include repo `docs/` (see `.dockerignore`)

Local stack:

```bash
docker compose up --build
docker compose exec api node node_modules/prisma/build/index.js migrate deploy
docker compose exec api node dist/modules/auth/cli/synchronize-super-admin.js
```

## Coolify (generic)

The repository does not ship Coolify-specific manifests. Typical mapping:

1. **API service** — Dockerfile `docker/api/Dockerfile`, port 4000, env from Coolify secrets.
2. **Web service** — Dockerfile `docker/web/Dockerfile`, port 3000, build arg `API_INTERNAL_URL=http://<api-service-name>:4000`.
3. **PostgreSQL & Redis** — Coolify managed databases or linked containers; set `DATABASE_URL` and `REDIS_URL` on the API.
4. **Pre-deploy command (API)** — `node node_modules/prisma/build/index.js migrate deploy` (once per release).
5. **Health** — readiness URL on API; web depends on API healthy.
6. **TLS** — terminate HTTPS at Coolify/proxy; set `WEB_ORIGIN` to the public HTTPS admin URL and `TRUST_PROXY=1` on the API.

Object storage: configure S3 (or compatible) credentials per [STORAGE.md](./STORAGE.md).

## Security (operational)

- **CORS:** Only `WEB_ORIGIN` and `CORS_ALLOWED_ORIGINS` (credentials enabled).
- **Helmet** with `crossOriginResourcePolicy: same-site`.
- **Cookies:** `SameSite=strict`, `Secure` when `COOKIE_SECURE` / production default.
- **Swagger:** off by default in production.
- **Errors:** Generic message for 500s; stacks logged server-side only.
- **Logs:** Redact auth headers, cookies, passwords, tokens (see `REDACTED_LOG_PATHS` in logging module).
- **Webhooks:** Raw body + signature verification on WhatsApp routes; 2 MB JSON limit on webhook path only.

## Observability

Built-in: **Pino** structured logs to stdout, **request ID** (`x-request-id`).

Not included in this repository: Sentry, OpenTelemetry, or APM agents. Wire log shipping (Loki, CloudWatch, etc.) at the platform layer.

## Graceful shutdown

Nest `enableShutdownHooks()` disconnects Prisma and Redis (`quit` / `disconnect`). Workers clear interval timers on module destroy. Send **SIGTERM** to the Node process (Docker/Kubernetes default).

## Rollback

1. Route traffic back to previous image tag.
2. **Schema rollback:** Prisma has no automatic down migration in production — restore database from backup or apply a forward fix migration. Plan accordingly.
3. Redeploy previous API/web images if application code regressed.

See [BACKUP-RECOVERY.md](./BACKUP-RECOVERY.md).

## Performance notes

| Setting | Default | Notes |
|---------|---------|-------|
| `DATABASE_POOL_MAX` | 10 | Scale with replica count |
| `API_BODY_LIMIT` | 100kb | General JSON; webhooks 2 MB |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | 300 | Per IP |
| WhatsApp worker tick | 2s | Lock TTL 60s |
| Media cleanup interval | 60s | Batch 20 jobs |

No HTTP server-level timeout is configured beyond provider defaults; Meta API client uses bounded fetch timeouts.

## Related docs

- [ENVIRONMENT.md](./ENVIRONMENT.md) — variable inventory
- [BACKUP-RECOVERY.md](./BACKUP-RECOVERY.md) — backups and restore order
- [STORAGE.md](./STORAGE.md) — S3 and cleanup
- [WHATSAPP.md](./WHATSAPP.md) — Meta integration
