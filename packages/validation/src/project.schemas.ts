import { z } from 'zod';
import { MONEY_PARSE_ERROR, normalizeMoneyInput } from './money.js';
import { collectProjectPhaseScheduleIssues } from './project-phase-schedule.js';
import { projectTaskPrioritySchema } from './project-task-priority.schema.js';

const moneyString = z.union([
  z
    .number()
    .refine((value) => Number.isFinite(value) && value >= 0, { message: MONEY_PARSE_ERROR })
    .transform(String),
  z.string().transform((raw, ctx) => {
    const result = normalizeMoneyInput(raw);
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
]);

/** Coerce API/datetime strings to `YYYY-MM-DD` before ISO date validation. */
export function normalizeIsoDateOnlyInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1] : trimmed;
}

const dateOnly = z.preprocess(
  normalizeIsoDateOnlyInput,
  z.iso.date({ error: 'Enter a valid date.' }),
);

export const projectStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const projectPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const projectLifecyclePhaseSchema = z.enum([
  'PLANNING',
  'PRODUCTION',
  'QA',
  'DEPLOYMENT',
  'HANDOVER',
  'COMPLETED',
]);

export const projectPhaseStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
]);

export const projectExecutionLifecycleSchema = z.enum([
  'NOT_PLANNED',
  'PLANNED',
  'IN_PRODUCTION',
  'COMPLETED',
]);

export const projectLifecycleTabSchema = z.enum([
  'ALL',
  'NOT_PLANNED',
  'PLANNED',
  'IN_PRODUCTION',
  'COMPLETED',
]);

const uuid = z.string().uuid();

const emptyStringToNull = (value: unknown): unknown => (value === '' ? null : value);

const optionalNullableUuid = z.preprocess(
  emptyStringToNull,
  uuid.nullable().optional(),
);

const optionalTrimmedDescription = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().max(4000).optional(),
);

/** Plain phase row for create/update payloads. Sort order is derived from array index at persistence. */
export const projectPhaseInputObjectSchema = z
  .object({
    id: uuid.optional(),
    name: z.string().trim().min(1, 'Enter a phase name.').max(200),
    description: optionalTrimmedDescription,
    startDate: dateOnly,
    expectedEndDate: dateOnly,
    ownerAdminId: optionalNullableUuid,
    status: projectPhaseStatusSchema.optional(),
  })
  .strict()
  .check((ctx) => {
    const data = ctx.value;
    if (data.expectedEndDate < data.startDate) {
      ctx.issues.push({
        code: 'custom',
        message: 'Expected end date must be on or after the start date.',
        path: ['expectedEndDate'],
        input: ctx.value,
      });
    }
  });

export const projectPhaseInputSchema = projectPhaseInputObjectSchema;

type ProjectRequestWithPhases = {
  startDate?: string;
  expectedEndDate?: string;
  phases?: z.infer<typeof projectPhaseInputObjectSchema>[];
};

function applyProjectRequestChecks(ctx: {
  value: unknown;
  issues: { push: (issue: { code: 'custom'; message: string; path: PropertyKey[]; input: unknown }) => void };
}): void {
  const data = ctx.value as ProjectRequestWithPhases;

  if (data.startDate && data.expectedEndDate && data.expectedEndDate < data.startDate) {
    ctx.issues.push({
      code: 'custom',
      message: 'Expected end date must be on or after the start date.',
      path: ['expectedEndDate'],
      input: ctx.value,
    });
  }

  if (data.phases) {
    data.phases.forEach((phase, index) => {
      const parsed = projectPhaseInputSchema.safeParse(phase);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.issues.push({
            code: 'custom',
            message: typeof issue.message === 'string' ? issue.message : 'Enter a valid value.',
            path: ['phases', index, ...issue.path],
            input: ctx.value,
          });
        }
      }
    });
  }

  if (data.phases?.length && data.startDate && data.expectedEndDate) {
    const schedulePhases = data.phases.map((phase) => ({
      startDate: phase.startDate,
      expectedEndDate: phase.expectedEndDate,
    }));
    const scheduleIssues = collectProjectPhaseScheduleIssues(schedulePhases, {
      projectStartDate: data.startDate,
      projectExpectedEndDate: data.expectedEndDate,
    });
    for (const issue of scheduleIssues) {
      ctx.issues.push({
        code: 'custom',
        message: issue.message,
        path: ['phases', issue.index, issue.field],
        input: ctx.value,
      });
    }
  }
}

/** Plain object shape — cross-field rules use `.check()` so Nest Standard Schema keeps all keys. */
const projectRequestObjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a project name.').max(200),
    priority: projectPrioritySchema,
    projectManagerAdminId: optionalNullableUuid,
    startDate: dateOnly,
    expectedEndDate: dateOnly,
    description: z.string().max(4000).optional(),
    clientId: uuid,
    proposalId: optionalNullableUuid,
    acceptedCommercialValue: moneyString.optional(),
    scopeAndRequirements: z.string().max(8000).optional(),
    phases: z.array(projectPhaseInputObjectSchema).optional(),
  })
  .strict();

/** Per-field schemas for admin live validation (cross-field rules use the full request schemas). */
export const projectFormLiveFieldSchemas = {
  name: projectRequestObjectSchema.shape.name,
  priority: projectRequestObjectSchema.shape.priority,
  startDate: projectRequestObjectSchema.shape.startDate,
  expectedEndDate: projectRequestObjectSchema.shape.expectedEndDate,
  clientId: projectRequestObjectSchema.shape.clientId,
  projectManagerAdminId: projectRequestObjectSchema.shape.projectManagerAdminId,
  description: projectRequestObjectSchema.shape.description,
  proposalId: projectRequestObjectSchema.shape.proposalId,
  acceptedCommercialValue: projectRequestObjectSchema.shape.acceptedCommercialValue,
  scopeAndRequirements: projectRequestObjectSchema.shape.scopeAndRequirements,
} as const;

/** Object shape for Nest `@Body({ schema })` — includes `phases` in Standard Schema metadata. */
export const createProjectRequestBodySchema = projectRequestObjectSchema;

/** Full create validation including cross-field phase schedule rules. */
export const createProjectRequestSchema = projectRequestObjectSchema.check(applyProjectRequestChecks);

export const updateProjectRequestBodySchema = projectRequestObjectSchema.partial().strict();

export const updateProjectRequestSchema = updateProjectRequestBodySchema.check(applyProjectRequestChecks);

export const changeProjectStatusRequestSchema = z
  .object({
    status: projectStatusSchema,
  })
  .strict();

const projectListQueryShape = {
  search: z.string().max(200).optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  lifecycleTab: projectLifecycleTabSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
} as const;

export const projectListQuerySchema = z.object(projectListQueryShape).strict();

const projectListQueryKeys = Object.keys(projectListQueryShape) as (keyof typeof projectListQueryShape)[];

export function parseProjectListQuery(input: unknown): z.infer<typeof projectListQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const picked: Record<string, unknown> = {};
  for (const key of projectListQueryKeys) {
    if (key in record) picked[key] = record[key];
  }
  return projectListQuerySchema.parse(picked);
}

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type ChangeProjectStatusRequest = z.infer<typeof changeProjectStatusRequestSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type ProjectPhaseInput = z.infer<typeof projectPhaseInputSchema>;

const planTaskDateOptional = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return null;
    return normalizeIsoDateOnlyInput(value);
  },
  z.iso.date({ error: 'Enter a valid date.' }).nullable().optional(),
);

export const projectPlanTaskInputSchema = z
  .object({
    id: uuid.optional(),
    title: z.string().trim().min(1, 'Enter a task title.').max(200),
    description: optionalTrimmedDescription,
    priority: projectTaskPrioritySchema.optional(),
    assigneeAdminId: optionalNullableUuid,
    startDate: planTaskDateOptional,
    dueDate: planTaskDateOptional,
  })
  .strict()
  .check((ctx) => {
    const { startDate, dueDate } = ctx.value;
    if (startDate && dueDate && dueDate < startDate) {
      ctx.issues.push({
        code: 'custom',
        message: 'Due date must be on or after the start date.',
        path: ['dueDate'],
        input: ctx.value,
      });
    }
  });

export const projectPlanPhaseInputSchema = projectPhaseInputObjectSchema.extend({
  tasks: z.array(projectPlanTaskInputSchema),
});

export const saveProjectPlanRequestSchema = z
  .object({
    phases: z.array(projectPlanPhaseInputSchema).min(1, 'Add at least one phase.'),
  })
  .strict();

export type SaveProjectPlanRequest = z.infer<typeof saveProjectPlanRequestSchema>;

export const reorderProjectPhasesRequestSchema = z
  .object({
    orderedPhaseIds: z.array(uuid).min(1),
  })
  .strict();

export type ReorderProjectPhasesRequest = z.infer<typeof reorderProjectPhasesRequestSchema>;
