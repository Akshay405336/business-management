# Environment variables

All API runtime configuration is validated at startup by `apps/api/src/config/env.schema.ts` and exposed as `AppConfig`. Validation errors name the variable and rule only — **never secret values**.

Load order: process environment wins; local dev may load repository-root `.env` via `loadEnvFile()` before validation.

## Core API

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `NODE_ENV` | No | `development` | Runtime mode: `development`, `production`, `test` | Config, Swagger default, cookie secure default, storage default |
| `API_HOST` | No | `0.0.0.0` | HTTP bind address | Nest listen |
| `API_PORT` | No | `4000` | HTTP port | Nest listen |
| `API_BODY_LIMIT` | No | `100kb` | JSON body limit (Express) | `main.ts` (non-webhook routes) |
| `TRUST_PROXY` | No | `loopback` | Express trust proxy: `true`/`false`, hop count, or subnet list | Rate limit client IP, secure cookies behind proxy. **Production:** must not be `false` or `loopback` (see schema) |
| `LOG_LEVEL` | No | `info` | Pino log level | Logging module |
| `LOG_PRETTY` | No | `false` | Pretty-print logs (dev). **Production:** must be `false` | Logging module |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | No | `300` | Global per-IP requests per minute | Global rate limit middleware |
| `DISTRIBUTED_LOCK_STRICT` | No | `false` | Skip worker ticks when Redis lock cannot be acquired (recommended `true` for multi-replica prod) | `RedisExclusiveLockService` |

## Data stores

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (`postgresql://…`) | Prisma, health ready |
| `DATABASE_POOL_MAX` | No | `10` | Prisma PG adapter pool `max` | `PrismaService` |
| `REDIS_URL` | **Yes** | — | Redis URL (`redis://` or `rediss://`) | Sessions/cache, locks, rate limit, ready probe |

**Development:** local Postgres/Redis URLs from `.env.example`.  
**Production:** managed Postgres + Redis (TLS providers: prefer `rediss://`). Upstash `redis://` hosts are upgraded to TLS at runtime with a startup warning.

## Web / CORS

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `WEB_ORIGIN` | **Yes** | — | Primary admin web origin (normalized to origin only) | CORS, origin-check middleware |
| `CORS_ALLOWED_ORIGINS` | No | — | Comma-separated extra origins (merged with `WEB_ORIGIN`) | CORS |

**Production:** public origins must use HTTPS (HTTP allowed only for `localhost` / `127.0.0.1` for local Docker stacks).

## Authentication and cookies

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `JWT_ACCESS_SECRET` | **Yes** | — | HMAC secret for access tokens (min 32 chars; **48+ in production**) | JWT verifier |
| `JWT_ISSUER` | No | `techwin-api` | JWT `iss` | JWT verifier |
| `JWT_AUDIENCE` | No | `techwin-platform-admin` | JWT `aud` | JWT verifier |
| `TOTP_ENCRYPTION_KEY` | **Yes** | — | Base64 32-byte AES key for TOTP secrets at rest | Platform TOTP resolver |
| `TOTP_ENCRYPTION_PREVIOUS_KEYS` | No | — | Comma-separated previous keys for rotation | Platform TOTP resolver |
| `TOTP_ISSUER` | No | `Techwin` | Authenticator app label | TOTP enrollment |
| `COOKIE_SECURE` | No | `true` in production | `Secure` flag on auth cookies | Platform auth cookies |
| `SWAGGER_ENABLED` | No | `false` in production | OpenAPI UI at `/api/v1/docs` | `main.ts` |

## Object storage

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `STORAGE_PROVIDER` | No | `local` (dev), `s3` (prod) | `local` disk or `s3` | Storage module |
| `AWS_ACCESS_KEY_ID` | When `s3` | — | S3 access key | S3 client |
| `AWS_SECRET_ACCESS_KEY` | When `s3` | — | S3 secret | S3 client |
| `AWS_REGION` | No | `ap-south-1` | S3 region | S3 client |
| `AWS_S3_BUCKET` | No | `techwin-s3` | Bucket name | S3 client |
| `STORAGE_PRESIGNED_TTL_SECONDS` | No | `900` | Presigned GET lifetime | Media / stored files |
| `STORAGE_EMPLOYEE_PROFILE_MAX_BYTES` | No | `5242880` (5 MB) | Max employee profile upload | Media validation |
| `MEDIA_CLEANUP_WORKER_ENABLED` | No | `true` | Background S3 delete retry worker | `StoredObjectCleanupJobRunner` |
| `MEDIA_CLEANUP_INTERVAL_MS` | No | `60000` | Worker tick interval | Cleanup runner |
| `MEDIA_CLEANUP_BATCH_SIZE` | No | `20` | Jobs per tick | Cleanup handler |

See [STORAGE.md](./STORAGE.md) for IAM and Coolify notes.

## WhatsApp (optional until configured)

| Variable | Required | Default | Purpose | Used by |
|----------|----------|---------|---------|---------|
| `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY` | Optional | — | Base64 32-byte key for channel tokens at rest | Credential cipher |
| `WHATSAPP_CREDENTIALS_PREVIOUS_KEYS` | No | — | Key rotation | Credential cipher |
| `WHATSAPP_WEBHOOK_BASE_URL` | **Production when WhatsApp env set** | — | Public HTTPS base for Meta webhooks | Channel setup, Phase 4B validation |
| `META_APP_ID` | Optional | — | Embedded Signup | Meta API |
| `META_APP_SECRET` | Optional | — | 32-char hex; webhook fallback | Meta API, webhooks |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Optional | — | Embedded Signup config | Meta API |
| `META_GRAPH_API_VERSION` | No | `v23.0` | Graph API version segment | Meta client |
| `META_GRAPH_API_BASE_URL` | No | `https://graph.facebook.com` | Graph API host | Meta client |
| `WHATSAPP_MEDIA_MAX_BYTES` | No | 16 MB | Inbound/outbound media cap | WhatsApp module |
| `WHATSAPP_WORKER_ENABLED` | No | `true` | Background webhook/retry/broadcast worker | `WhatsAppJobRunner` |

**Production:** if any of `META_APP_ID`, `META_APP_SECRET`, or `WHATSAPP_CREDENTIALS_ENCRYPTION_KEY` is set, `WHATSAPP_WEBHOOK_BASE_URL` must be a valid **HTTPS** URL.

Webhook JSON body limit is **2 MB** on `/api/v1/webhooks/whatsapp/*` (separate from `API_BODY_LIMIT`). Raw body is preserved for signature verification.

## Super Admin seed (CLI only)

Not read by the HTTP API. Used by `pnpm db:seed` and bootstrap CLIs.

| Variable | Required | Purpose |
|----------|----------|---------|
| `PLATFORM_ADMIN_EMAIL` | For seed | Super Admin email |
| `PLATFORM_ADMIN_PASSWORD` | For seed | Plain password (hashed at seed; never logged) |
| `PLATFORM_ADMIN_NAME` | No | Display name (default `Super Admin`) |

## Docker Compose interpolation

Used by `docker-compose.yml` for Postgres service — not read by the API process unless passed through `.env`:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` | Postgres role |
| `POSTGRES_PASSWORD` | Postgres password |
| `POSTGRES_DB` | Database name |
| `WEB_PORT` | Host port for web container |
| `API_PUBLISH_PORT` | Host port for API container |

## Web app (Next.js — not validated by API schema)

| Variable | Purpose |
|----------|---------|
| `API_INTERNAL_URL` | Server-side rewrite target for `/api/v1` |
| `NEXT_PUBLIC_API_BASE_URL` | Browser API base (empty = same-origin) |

## Unknown variables

Variables not listed above are ignored by API startup validation. Avoid setting undocumented `process.env` keys for the API except via future schema updates.

## Generating secrets

```bash
pnpm secrets:generate
```

Produces JWT, TOTP, and sample Postgres password strings suitable for `.env`.
