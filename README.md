# Techwin

Reusable foundation for business applications: a NestJS API and a Next.js admin app in a pnpm workspace. Platform Super Admins sign in with email and password, then a TOTP code from an authenticator app.

## Requirements

- Node.js 22.12 or later (LTS)
- pnpm 10.28 or later (`corepack enable` then `corepack prepare pnpm@10.28.2 --activate`)
- PostgreSQL 16+
- Redis 7+
- Docker (optional, for the Compose stack)

## Install

```bash
pnpm install
cp .env.example .env
pnpm secrets:generate
```

Copy the printed `JWT_ACCESS_SECRET` and `TOTP_ENCRYPTION_KEY` into `.env`. Do not replace `TOTP_ENCRYPTION_KEY` later in an environment that already has enrolled administrators; rotate by moving the old key to `TOTP_ENCRYPTION_PREVIOUS_KEYS`.

Create a PostgreSQL role and database that match `DATABASE_URL`, and start Redis at `REDIS_URL`.

```sql
CREATE USER techwin WITH PASSWORD 'techwin_dev_change_me';
CREATE DATABASE techwin OWNER techwin;
```

## Database and first Super Admin

Set these **server-only** values in `.env` (never `NEXT_PUBLIC_*`):

```dotenv
PLATFORM_ADMIN_EMAIL=admin@example.com
PLATFORM_ADMIN_PASSWORD=replace_with_a_strong_password
PLATFORM_ADMIN_NAME=Super Admin
```

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`pnpm db:setup` runs generate, `migrate deploy`, and the seed. It never drops data.

Every `pnpm db:seed` run synchronizes the **sole** Platform Super Admin to the current `.env`: it hashes `PLATFORM_ADMIN_PASSWORD` with Argon2id, generates a **new** TOTP secret, encrypts it with `TOTP_ENCRYPTION_KEY`, removes any other Super Admin rows, and revokes existing sessions, refresh tokens, and authentication challenges. Scan the printed QR code (or enter the setup key) after **every** seed — the previous authenticator enrollment is invalid.

The seed fails immediately if `PLATFORM_ADMIN_EMAIL` or `PLATFORM_ADMIN_PASSWORD` is missing or does not meet policy (at least 12 characters, upper and lower case, a digit, and a symbol). It never logs the password, password hash, TOTP secret encryption key, or database URL.

`pnpm admin:bootstrap` remains an optional interactive tool for first-time provision without overwriting an existing account unless you pass `--reset-password` / `--rotate-totp`.

## Development

```bash
pnpm dev          # Turborepo: API (http://localhost:4000) and web (http://localhost:3000)
pnpm dev:api
pnpm dev:web
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login). Swagger is at [http://localhost:4000/api/v1/docs](http://localhost:4000/api/v1/docs) when `SWAGGER_ENABLED` is true (default in development).

The browser calls `/api/v1/*` on the web origin. Next.js rewrites to the API so auth cookies stay first-party.

## Production build (host)

```bash
pnpm build
pnpm start:api    # node apps/api/dist/main.js
pnpm start:web    # next start --port 3000
```

Set `NODE_ENV=production`, a 48+ character `JWT_ACCESS_SECRET`, `COOKIE_SECURE=true` behind HTTPS, and `TRUST_PROXY` to match your reverse proxy.

## Docker Compose

Dockerfiles live only under `docker/` and expect the **repository root** as the build context.

```bash
cp .env.example .env   # fill secrets; POSTGRES_* are used by Compose
docker compose up --build
docker compose exec api ./node_modules/.bin/prisma migrate deploy
docker compose exec api node dist/modules/auth/cli/synchronize-super-admin.js
```

Then open [http://localhost:3000/admin/login](http://localhost:3000/admin/login). PostgreSQL and Redis are not published on the host; only the API (`4000`) and web (`3000`) are. Data is stored in the named volume `techwin_postgres_data` and is never deleted by Compose.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm check:architecture
pnpm build
```

`pnpm check:architecture` rejects domain/infrastructure leaks, circular imports, spec/test files, and Dockerfiles outside `docker/`.

## API

Prefix: `/api/v1`

| Method | Path                                 | Auth                         |
| ------ | ------------------------------------ | ---------------------------- |
| POST   | `/auth/platform/login`               | —                            |
| POST   | `/auth/platform/verify-totp`         | challenge cookie             |
| POST   | `/auth/platform/refresh`             | refresh cookie + CSRF header |
| GET    | `/auth/platform/me`                  | Bearer access token          |
| POST   | `/auth/platform/logout`              | refresh cookie or Bearer     |
| GET    | `/auth/platform/sessions`            | Bearer                       |
| DELETE | `/auth/platform/sessions/:sessionId` | Bearer                       |
| POST   | `/auth/platform/logout-all`          | Bearer                       |
| GET    | `/health`                            | —                            |
| GET    | `/ready`                             | —                            |

Access tokens last 15 minutes. Refresh sessions last 7 days and rotate on every refresh. TOTP secrets are encrypted at rest with `TOTP_ENCRYPTION_KEY`.

## Web routes

| Path                 | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `/admin/login`       | Email and password                           |
| `/admin/verify-totp` | Authenticator code                           |
| `/admin/dashboard`   | Signed-in shell (session restored on reload) |

## File storage (S3)

Employee profile images and future attachments use the centralized media module. Configure optional AWS variables in `.env` and see [docs/STORAGE.md](docs/STORAGE.md) for IAM, Coolify, presigned previews, and cleanup recovery.

## Workspace scripts

| Script                    | Action                                    |
| ------------------------- | ----------------------------------------- |
| `pnpm dev`                | Generate Prisma client and run API + web  |
| `pnpm build`              | Production build of every package and app |
| `pnpm lint`               | ESLint across the workspace               |
| `pnpm typecheck`          | TypeScript across the workspace           |
| `pnpm format`             | Prettier write                            |
| `pnpm format:check`       | Prettier check                            |
| `pnpm check:architecture` | Layer and repository rules                |
| `pnpm db:generate`        | Prisma Client                             |
| `pnpm db:migrate`         | Prisma migrate dev                        |
| `pnpm db:seed`            | Sync Super Admin from `PLATFORM_ADMIN_*`  |
| `pnpm db:setup`           | generate + migrate deploy + seed          |
| `pnpm admin:bootstrap`    | Optional idempotent Super Admin provision |
| `pnpm secrets:generate`   | Print new JWT / TOTP / Postgres secrets   |
