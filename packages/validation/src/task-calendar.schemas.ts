import { z } from 'zod';
import {
  dailyTaskCategorySchema,
  dailyTaskPrioritySchema,
  dailyTaskTypeSchema,
} from './daily-task.schemas.js';
import { projectTaskPrioritySchema, projectTaskStatusSchema } from './project-task.schemas.js';
import { projectPrioritySchema, projectStatusSchema } from './project.schemas.js';

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

const calendarTaskSourceSchema = z.enum(['DAILY_TASK', 'PROJECT_TASK']);
export const calendarTaskDisplayStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'REVIEW',
  'ON_HOLD',
  'COMPLETED',
  'OVERDUE',
]);

const taskCalendarApiQueryBase = z
  .object({
    clientToday: dateOnly.optional(),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    search: z.string().max(200).optional(),
    type: dailyTaskTypeSchema.optional(),
    employeeId: uuid.optional(),
    projectId: uuid.optional(),
    priority: dailyTaskPrioritySchema.optional(),
    projectTaskPriority: projectTaskPrioritySchema.optional(),
    workflowStageId: uuid.optional(),
    projectPhaseId: uuid.optional(),
    category: dailyTaskCategorySchema.optional(),
    completedOnly: z.coerce.boolean().optional(),
    overdueOnly: z.coerce.boolean().optional(),
    sortBy: z.enum(['assignDate', 'dueDate', 'priority', 'title', 'updatedAt']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    projectStatus: projectStatusSchema.optional(),
    projectPriority: projectPrioritySchema.optional(),
    source: calendarTaskSourceSchema.optional(),
    status: z.string().min(1).max(64).optional(),
    displayStatus: calendarTaskDisplayStatusSchema.optional(),
  })
  .strict();

const normalizedTaskCalendarQuerySchema = taskCalendarApiQueryBase
  .transform((val) => {
    const startDate = val.startDate ?? val.dateFrom;
    const endDate = val.endDate ?? val.dateTo;
    return { ...val, startDate, endDate };
  })
  .superRefine((val, ctx) => {
    if (!val.startDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'startDate is required.' });
    }
    if (!val.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate is required.' });
    }
    if (val.startDate && val.endDate && val.startDate > val.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'endDate must be on or after startDate.',
      });
    }
  });

export const taskCalendarApiQuerySchema = normalizedTaskCalendarQuerySchema;

export type TaskCalendarApiQuery = z.infer<typeof normalizedTaskCalendarQuerySchema>;

const taskCalendarKeys = [
  'clientToday',
  'startDate',
  'endDate',
  'dateFrom',
  'dateTo',
  'search',
  'type',
  'employeeId',
  'projectId',
  'priority',
  'projectTaskPriority',
  'workflowStageId',
  'projectPhaseId',
  'category',
  'completedOnly',
  'overdueOnly',
  'sortBy',
  'sortDir',
  'projectStatus',
  'projectPriority',
  'source',
  'status',
  'displayStatus',
] as const;

function pickQuery(input: unknown): Record<string, unknown> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const picked: Record<string, unknown> = {};
  for (const key of taskCalendarKeys) {
    if (key in record) picked[key] = record[key];
  }
  return picked;
}

export function parseTaskCalendarApiQuery(input: unknown): TaskCalendarApiQuery {
  return taskCalendarApiQuerySchema.parse(pickQuery(input));
}

/** @deprecated Use parseTaskCalendarApiQuery */
export const taskCalendarListQuerySchema = taskCalendarApiQuerySchema;

/** @deprecated Use parseTaskCalendarApiQuery */
export function parseTaskCalendarListQuery(input: unknown): TaskCalendarApiQuery {
  return parseTaskCalendarApiQuery(input);
}

export { projectTaskStatusSchema };
