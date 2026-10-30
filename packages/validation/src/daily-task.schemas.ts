import { z } from 'zod';

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

export const dailyTaskTypeSchema = z.enum(['GENERAL', 'PROJECT']);
export const dailyTaskCategorySchema = z.enum([
  'DEVELOPMENT',
  'DESIGN',
  'TESTING',
  'DOCUMENTATION',
  'MEETING',
  'SUPPORT',
  'ADMINISTRATION',
  'RESEARCH',
  'OTHER',
]);
export const dailyTaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const dailyTaskWorkflowStageInputSchema = z
  .object({
    id: uuid.optional(),
    stageKey: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    sortOrder: z.number().int().min(0),
    colorToken: z.string().trim().min(1).max(32),
    isActive: z.boolean(),
    isCompletedStage: z.boolean(),
  })
  .strict();

export const updateDailyTaskWorkflowStagesRequestSchema = z
  .object({
    stages: z.array(dailyTaskWorkflowStageInputSchema).min(1),
  })
  .strict();

export const createDailyTaskRequestSchema = z
  .object({
    type: dailyTaskTypeSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).optional(),
    category: dailyTaskCategorySchema.optional(),
    workflowStageId: uuid.optional(),
    projectPhaseId: uuid.optional(),
    priority: dailyTaskPrioritySchema.optional(),
    assignDate: dateOnly,
    dueDate: dateOnly.nullable().optional(),
    startTimeMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable().optional(),
    dueTimeMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable().optional(),
    estimatedHours: z.number().min(0).max(999).nullable().optional(),
    projectId: uuid.nullable().optional(),
    linkedProjectTaskId: uuid.nullable().optional(),
    instructions: z.string().max(4000).optional(),
    referenceUrl: z.string().url().max(512).nullable().optional(),
    employeeIds: z.array(uuid).min(1, 'Assign at least one employee.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === 'PROJECT' && !value.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'Select a project.' });
    }
    if (value.type === 'PROJECT' && !value.projectPhaseId) {
      ctx.addIssue({ code: 'custom', path: ['projectPhaseId'], message: 'Select a project stage.' });
    }
    if (value.type === 'PROJECT' && !value.workflowStageId) {
      ctx.addIssue({
        code: 'custom',
        path: ['workflowStageId'],
        message: 'Select a daily workflow status.',
      });
    }
    if (value.type === 'GENERAL' && !value.workflowStageId) {
      ctx.addIssue({ code: 'custom', path: ['workflowStageId'], message: 'Select a daily workflow status.' });
    }
    if (value.type === 'GENERAL' && value.projectPhaseId) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectPhaseId'],
        message: 'General tasks cannot use a project stage.',
      });
    }
    if (value.type === 'GENERAL' && value.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'General tasks cannot reference a project.' });
    }
    if (value.dueDate && value.dueDate < value.assignDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Due date must be on or after the assign date.',
      });
    }
  });

export const updateDailyTaskRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(4000).optional(),
    category: dailyTaskCategorySchema.nullable().optional(),
    workflowStageId: uuid.nullable().optional(),
    projectPhaseId: uuid.nullable().optional(),
    priority: dailyTaskPrioritySchema.optional(),
    assignDate: dateOnly.optional(),
    dueDate: dateOnly.nullable().optional(),
    startTimeMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable().optional(),
    dueTimeMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable().optional(),
    estimatedHours: z.number().min(0).max(999).nullable().optional(),
    projectId: uuid.nullable().optional(),
    linkedProjectTaskId: uuid.nullable().optional(),
    instructions: z.string().max(4000).optional(),
    referenceUrl: z.string().url().max(512).nullable().optional(),
    employeeIds: z.array(uuid).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: 'custom', path: [], message: 'Provide at least one field to update.' });
    }
  });

export const moveDailyTaskStageRequestSchema = z
  .object({
    workflowStageId: uuid,
  })
  .strict();

export const rescheduleDailyTaskRequestSchema = z
  .object({
    assignDate: dateOnly,
    note: z.string().max(1000).optional(),
  })
  .strict();

export const dailyTaskBoardQuerySchema = z
  .object({
    assignDate: dateOnly,
    clientToday: dateOnly.optional(),
    search: z.string().max(200).optional(),
    type: dailyTaskTypeSchema.optional(),
    employeeId: uuid.optional(),
    projectId: uuid.optional(),
    priority: dailyTaskPrioritySchema.optional(),
    workflowStageId: uuid.optional(),
    projectPhaseId: uuid.optional(),
    category: dailyTaskCategorySchema.optional(),
  })
  .strict();

export const dailyTaskListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().max(200).optional(),
    assignDate: dateOnly.optional(),
    assignDateFrom: dateOnly.optional(),
    assignDateTo: dateOnly.optional(),
    type: dailyTaskTypeSchema.optional(),
    employeeId: uuid.optional(),
    projectId: uuid.optional(),
    priority: dailyTaskPrioritySchema.optional(),
    workflowStageId: uuid.optional(),
    projectPhaseId: uuid.optional(),
    category: dailyTaskCategorySchema.optional(),
    completedOnly: z.coerce.boolean().optional(),
    overdueOnly: z.coerce.boolean().optional(),
    sortBy: z.enum(['assignDate', 'dueDate', 'priority', 'title', 'updatedAt']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const myDailyTasksQuerySchema = z
  .object({
    scope: z.enum(['today', 'upcoming', 'all', 'completed', 'overdue']).optional(),
    assignDate: dateOnly.optional(),
  })
  .strict();

export function parseDailyTaskBoardQuery(input: unknown): z.infer<typeof dailyTaskBoardQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const keys = [
    'assignDate',
    'clientToday',
    'search',
    'type',
    'employeeId',
    'projectId',
    'priority',
    'workflowStageId',
    'projectPhaseId',
    'category',
  ] as const;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) picked[key] = record[key];
  }
  return dailyTaskBoardQuerySchema.parse(picked);
}

export function parseDailyTaskListQuery(input: unknown): z.infer<typeof dailyTaskListQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return dailyTaskListQuerySchema.parse(record);
}

export function parseMyDailyTasksQuery(input: unknown): z.infer<typeof myDailyTasksQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const keys = ['scope', 'assignDate'] as const;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) picked[key] = record[key];
  }
  return myDailyTasksQuerySchema.parse(picked);
}

export type UpdateDailyTaskWorkflowStagesRequest = z.infer<
  typeof updateDailyTaskWorkflowStagesRequestSchema
>;
export type CreateDailyTaskRequest = z.infer<typeof createDailyTaskRequestSchema>;
export type UpdateDailyTaskRequest = z.infer<typeof updateDailyTaskRequestSchema>;
export type MoveDailyTaskStageRequest = z.infer<typeof moveDailyTaskStageRequestSchema>;
export type RescheduleDailyTaskRequest = z.infer<typeof rescheduleDailyTaskRequestSchema>;
export type DailyTaskBoardQuery = z.infer<typeof dailyTaskBoardQuerySchema>;
export type DailyTaskListQuery = z.infer<typeof dailyTaskListQuerySchema>;
export type MyDailyTasksQuery = z.infer<typeof myDailyTasksQuerySchema>;
