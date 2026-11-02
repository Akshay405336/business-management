# Module reference

Backend modules live under `apps/api/src/modules/`. Public cross-module exports are listed in each module's `index.ts`.

## Auth (`modules/auth`)

**Responsibility:** Platform administrator authentication (email/password, TOTP for Super Admin, refresh cookies, sessions).

| Area | Key pieces |
|------|------------|
| Domain | TOTP policies, `PlatformTotpSecret` VO, platform auth repository interface |
| Application | Login, verify TOTP, refresh, logout, session list/revoke handlers |
| Infrastructure | `PrismaPlatformAuthRepository`, JWT access token verifier, TOTP encryption |
| Presentation | `PlatformAuthController`, cookie + CSRF helpers, `PlatformAdminGuard` |

**Public exports:** `AuthModule`, guards, `PlatformAuthExceptionFilter`, TOTP protector types.

**Cross-module:** Used by all authenticated routes.

---

## Org Access (`modules/org-access`)

**Responsibility:** Organization members, roles, permissions, invitations, member account provisioning.

| Area | Key pieces |
|------|------------|
| Domain | `OrgAccessRepository`, `MemberAccountTransactionPort`, permission types |
| Application | Member CRUD, invitations, role CRUD, `PermissionCheckerService`, `MemberAccountService` |
| Infrastructure | Facade `PrismaOrgAccessRepository` + split persistence (members, roles, invitations, permissions); Redis permission cache |
| Presentation | `OrgAccessController`, `RequirePermissionsGuard`, permission decorators |

**Public exports:** Repository token, transaction port, permission guard/service, actor mapper.

**Cross-module:** Employees use `MEMBER_ACCOUNT_TRANSACTION` for linked login accounts.

---

## Employees (`modules/employees`)

**Responsibility:** Employee records, codes, profile images, employment status, deletion with login cleanup.

| Area | Key pieces |
|------|------------|
| Domain | `EmployeeRepository`, employment policies, salary mapping types |
| Application | CRUD, list, assignable list, profile image upload/stream handlers |
| Infrastructure | `PrismaEmployeeRepository`, salary mappers, unique violation mapper |
| Presentation | `EmployeesController`, media integration for images |

**Public exports:** `EmployeesModule` only (feature module consumed via HTTP).

**Cross-module:** Org Access (member accounts), Media (stored objects).

---

## Media (`modules/media`)

**Responsibility:** Stored object metadata, upload, presigned/local content, cleanup queue.

| Area | Key pieces |
|------|------------|
| Domain | `StoredObjectRepository`, cleanup lock port, file category policies |
| Application | Upload, open content, delete, `StoredFileService`, cleanup queue handler |
| Infrastructure | Prisma stored object repo, S3/local storage adapters, Redis cleanup lock |
| Presentation | `MediaController`, `MediaExceptionFilter` |

**Public exports:** `StoredFileService`, media errors, exception filter.

**Cross-module:** Employees, WhatsApp (message media).

---

## CRM (`modules/crm`)

**Responsibility:** Pipelines, stages, leads, activities, clients, proposals, service packages.

| Area | Key pieces |
|------|------------|
| Domain | `CrmRepository`, policies (contact duplicate, lifecycle), CRM errors |
| Application | Per-use-case handlers (list/create/update/bulk pipeline, lead move, convert, etc.) |
| Infrastructure | `PrismaCrmRepository` facade + split persistence (pipeline, lead, client, proposal, shared) |
| Presentation | Controllers: pipelines, leads, clients, proposals, service packages; org guard |

**Public exports:** `CRM_REPOSITORY`, `CrmModule`, exception filter.

---

## Projects (`modules/projects`)

**Responsibility:** Projects, phases, lifecycle (plan → production → complete), client links, managers.

| Area | Key pieces |
|------|------------|
| Domain | `ProjectRepository`, execution lifecycle policies, schedule/progress policies |
| Application | CRUD, plan save, status, production start, complete, list filters |
| Infrastructure | `PrismaProjectRepository` |
| Presentation | `ProjectsController` |

**Public exports:** `ProjectsModule`.

---

## Project Tasks (`modules/projects` — tasks)

**Responsibility:** Per-project task board, phase tasks, ordering, assignments (distinct from Daily Tasks).

| Area | Key pieces |
|------|------------|
| Domain | `ProjectTaskRepository`, task progress/actual-time policies |
| Application | Board, CRUD, move, phase reorder handlers |
| Infrastructure | `PrismaProjectTaskRepository` |
| Presentation | `ProjectTasksController` |

---

## Daily Tasks (`modules/daily-tasks`)

**Responsibility:** General and project-linked daily work, workflow stages, board, my tasks.

| Area | Key pieces |
|------|------------|
| Domain | `DailyTaskRepository`, default workflow stages |
| Application | CRUD, board, reschedule, stage move, workflow stage admin |
| Infrastructure | `PrismaDailyTaskRepository` |
| Presentation | `DailyTasksController` |

**Public exports:** `DAILY_TASK_REPOSITORY`, module.

---

## WhatsApp (`modules/whatsapp`)

**Responsibility:** Meta Cloud API, channels, webhooks, inbox, messages, templates, broadcasts, analytics, realtime poll.

| Area | Key pieces |
|------|------------|
| Domain | Ports (settings, distributed lock, Meta API), policies |
| Application | Use-case handlers per feature; `WhatsAppJobRunner`; store interfaces in `application/repositories/` |
| Infrastructure | Prisma stores (message, inbox, channel, broadcast, …), Meta adapter, credential cipher, Redis lock |
| Presentation | Channel, inbox, campaigns, webhook, realtime controllers |

**Public exports:** `WhatsAppModule`.

---

## Health (`modules/health`)

**Responsibility:** Liveness and readiness probes.

| Area | Key pieces |
|------|------------|
| Application | `ReadinessService` (Postgres ping + Redis ping) |
| Presentation | `HealthController` — `/health`, `/ready` |

---

## Platform (`apps/api/src/platform`)

**Responsibility:** Shared tenant resolution for CRM/org-scoped routes (`TenantContextModule`, `CrmOrganizationGuard`).

---

## Shared infrastructure (`apps/api/src/infrastructure`)

| Component | Role |
|-----------|------|
| `PrismaService` | Single Prisma 7 PG adapter client, pool from `DATABASE_POOL_MAX` |
| `RedisService` | Shared ioredis client |
| `RedisExclusiveLockService` | Distributed locks for workers |
| `StorageModule` | Local or S3 object storage |
| `LoggingModule` | Pino HTTP logging, redaction, request IDs |

---

## Packages

See `@techwin/contracts` for route constants and shared response shapes used by the web app.
