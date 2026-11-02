# API reference

Global prefix: **`/api/v1`** (`API_PREFIX` in `@techwin/contracts`).

Authentication: Bearer access token for most org-scoped routes; platform auth uses cookies + CSRF for refresh. Permission keys enforced via Org Access guards on admin routes.

Route constants for the web app live in `@techwin/contracts` — keep web fetch paths aligned with these exports.

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | — |
| GET | `/ready` | — |

## Platform auth (`PLATFORM_AUTH_ROUTES`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/platform/login` | Password step |
| POST | `/auth/platform/verify-totp` | Super Admin TOTP |
| POST | `/auth/platform/refresh` | Cookie + CSRF |
| GET | `/auth/platform/me` | Bearer |
| POST | `/auth/platform/logout` | |
| GET | `/auth/platform/sessions` | Bearer |
| DELETE | `/auth/platform/sessions/:sessionId` | Bearer |
| POST | `/auth/platform/logout-all` | Bearer |

## Org access (`ORG_ACCESS_ROUTES`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/org-access/summary` | |
| GET | `/org-access/members` | Paginated list |
| GET | `/org-access/members/:id` | |
| PATCH | `/org-access/members/:id/roles` | |
| PATCH | `/org-access/members/:id/status` | |
| POST | `/org-access/members/:id/reset-password` | |
| DELETE | `/org-access/members/:id` | |
| GET/POST | `/org-access/invitations` | |
| POST | `/org-access/invitations/:id/resend` | |
| POST | `/org-access/invitations/:id/revoke` | |
| POST | `/org-access/invitations/accept` | |
| GET/POST | `/org-access/roles` | |
| GET/PATCH/DELETE | `/org-access/roles/:id` | |
| PUT/PATCH | `/org-access/roles/:id/permissions` | |
| GET | `/org-access/permissions` | Catalog |
| GET | `/org-access/me/permissions` | Current user |

## Employees (`EMPLOYEE_ROUTES`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/employees` | List + filters |
| GET | `/employees/assignable` | |
| GET | `/employees/code-preview` | |
| GET | `/employees/:id` | |
| POST | `/employees` | |
| PATCH | `/employees/:id` | |
| PATCH | `/employees/:id/status` | |
| DELETE | `/employees/:id` | |
| POST | `/employees/profile-image` | Upload |
| GET | `/employees/profile-stored-objects/:storedObjectId/content` | |
| GET | `/employees/profile-images/:organizationId/:fileName` | Legacy path |

## Media (`MEDIA_ROUTES`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/media/objects` | Upload |
| GET | `/media/objects/:id` | Metadata |
| GET | `/media/objects/:id/content` | Stream / presigned |
| DELETE | `/media/objects/:id` | |

## CRM (`CRM_ROUTES`)

Pipelines, stages, bulk status/delete, leads (list, CRUD, stage, activities, convert), clients, proposals (print, status), service packages — see `packages/contracts/src/crm.ts` for the full path map.

Base paths:

- `/crm/pipelines`, `/crm/pipelines/default`, `/crm/pipelines/bulk/*`
- `/crm/leads`, `/crm/leads/:id`, `/crm/leads/:id/stage`, `/crm/leads/:id/activities`, `/crm/leads/:id/convert`
- `/crm/clients`, `/crm/clients/from-lead/:leadId`, `/crm/clients/reference-preview`
- `/crm/proposals`, `/crm/service-packages`

## Projects (`PROJECT_ROUTES`)

- `/projects` (list, create)
- `/projects/:id` (get, patch, delete)
- `/projects/:id/plan`, `/projects/:id/start-production`, `/projects/:id/complete`, `/projects/:id/status`
- `/projects/number-preview`, `/projects/managers`, `/projects/client-options`
- `/projects/clients/:clientId/quotations`

## Project tasks (`PROJECT_TASK_ROUTES`)

- `/project-tasks/projects` (summaries)
- `/project-tasks/projects/:projectId/board`
- `/project-tasks/projects/:projectId/tasks` (CRUD)
- `/project-tasks/projects/:projectId/tasks/:taskId/move`
- `/project-tasks/projects/:projectId/phases/reorder`

## Daily tasks (`DAILY_TASK_ROUTES`)

- `/daily-tasks/workflow-stages` (GET/PATCH)
- `/daily-tasks/board`, `/daily-tasks/my`, `/daily-tasks` (list/create)
- `/daily-tasks/:id` (get/patch/delete)
- `/daily-tasks/:id/stage`, `/daily-tasks/:id/reschedule`

## WhatsApp

Controllers mount under `/whatsapp` and `/webhooks/whatsapp/:channelKey`. Full path list: `packages/contracts/src/whatsapp.ts` (`WHATSAPP_ROUTES` + webhook).

## Errors

Shared codes in `@techwin/contracts` (`API_ERROR_CODES`). Validation errors return structured `details` from Zod.

## Swagger

When `SWAGGER_ENABLED=true` (default in development): `/api/v1/docs` and `/api/v1/docs/openapi.json`.
