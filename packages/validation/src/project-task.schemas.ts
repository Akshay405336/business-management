import { z } from 'zod';
import { normalizeIsoDateOnlyInput, projectListQuerySchema } from './project.schemas.js';
import { projectTaskPrioritySchema } from './project-task-priority.schema.js';

export { projectTaskPrioritySchema };

const dateOnlyOptional = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return null;
    return normalizeIsoDateOnlyInput(value);
  },
  z.iso.date({ error: 'Enter a valid date.' }).nullable().optional(),
);

const uuid = z.string().uuid();

const emptyStringToNull = (value: unknown): unknown => (value === '' ? null : value);

const optionalNullableUuid = z.preprocess(
  emptyStringToNull,
  uuid.nullable().optional(),
);

export const projectTaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']);

const labelsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(12)
  .optional()
  .transform((value) => value ?? []);

const taskBodyShape = {
  title: z.string().trim().min(1, 'Enter a task title.').max(200),
  phaseId: uuid,
  priority: projectTaskPrioritySchema,
  status: projectTaskStatusSchema,
  description: z.string().max(4000).optional(),
  assigneeAdminId: optionalNullableUuid,
  startDate: dateOnlyOptional,
  dueDate: dateOnlyOptional,
  labels: labelsSchema,
};

function applyTaskDateChecks(ctx: {
  value: { startDate?: string | null; dueDate?: string | null };
  issues: { push: (issue: { code: 'custom'; message: string; path: PropertyKey[]; input: unknown }) => void };
  input: unknown;
}): void {
  const { startDate, dueDate } = ctx.value;
  if (startDate && dueDate && dueDate < startDate) {
    ctx.issues.push({
      code: 'custom',
      message: 'Due date must be on or after the start date.',
      path: ['dueDate'],
      input: ctx.input,
    });
  }
}

export const createProjectTaskRequestSchema = z
  .object(taskBodyShape)
  .strict()
  .check((ctx) => applyTaskDateChecks({ ...ctx, input: ctx.value }));

export const updateProjectTaskRequestSchema = z
  .object({
    title: taskBodyShape.title.optional(),
    phaseId: taskBodyShape.phaseId.optional(),
    priority: taskBodyShape.priority.optional(),
    status: taskBodyShape.status.optional(),
    description: taskBodyShape.description,
    assigneeAdminId: taskBodyShape.assigneeAdminId,
    startDate: taskBodyShape.startDate,
    dueDate: taskBodyShape.dueDate,
    labels: labelsSchema,
  })
  .strict()
  .check((ctx) => applyTaskDateChecks({ ...ctx, input: ctx.value }));

export const moveProjectTaskRequestSchema = z
  .object({
    phaseId: uuid,
    beforeTaskId: uuid.nullable().optional(),
  })
  .strict();

/** Reuses project list filters for the task landing page. */
export const projectTaskSummaryListQuerySchema = projectListQuerySchema;

export function parseProjectTaskSummaryListQuery(input: unknown) {
  return projectTaskSummaryListQuerySchema.parse(input);
}

export type CreateProjectTaskRequest = z.infer<typeof createProjectTaskRequestSchema>;
export type UpdateProjectTaskRequest = z.infer<typeof updateProjectTaskRequestSchema>;
export type MoveProjectTaskRequest = z.infer<typeof moveProjectTaskRequestSchema>;
export type ProjectTaskSummaryListQuery = z.infer<typeof projectTaskSummaryListQuerySchema>;
