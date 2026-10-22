import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import {
  projectTaskPrioritySchema,
  projectTaskStatusSchema,
} from '@techwin/validation';
import { z } from 'zod';

type SchemaObject = ApiResponseSchemaHost['schema'];

export const toOpenApiSchema = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;

const projectTaskResponseSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  phaseId: z.uuid(),
  title: z.string(),
  description: z.string(),
  status: projectTaskStatusSchema,
  priority: projectTaskPrioritySchema,
  assigneeAdminId: z.uuid().nullable(),
  assignee: z
    .object({
      id: z.uuid(),
      displayName: z.string(),
      email: z.string(),
    })
    .nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  labels: z.array(z.string()),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectTaskSummaryListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      projectNumber: z.string(),
      name: z.string(),
      clientId: z.uuid(),
      clientName: z.string(),
      companyName: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      status: z.enum(['ACTIVE', 'INACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
      startDate: z.string(),
      expectedEndDate: z.string(),
      phaseCount: z.number().int(),
      taskCount: z.number().int(),
      completedTaskCount: z.number().int(),
      progressPercent: z.number().int(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  tabCounts: z.object({
    all: z.number().int(),
    upcoming: z.number().int(),
    ongoing: z.number().int(),
    completed: z.number().int(),
  }),
});

export const projectTaskBoardResponseSchema = z.object({
  project: z.object({
    id: z.uuid(),
    projectNumber: z.string(),
    name: z.string(),
    clientName: z.string(),
    companyName: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    startDate: z.string(),
    expectedEndDate: z.string(),
    phaseCount: z.number().int(),
    taskCount: z.number().int(),
    completedTaskCount: z.number().int(),
    progressPercent: z.number().int(),
  }),
  phases: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      description: z.string(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
      startDate: z.string(),
      expectedEndDate: z.string(),
      sortOrder: z.number().int(),
      taskCount: z.number().int(),
      completedTaskCount: z.number().int(),
      progressPercent: z.number().int(),
      tasks: z.array(projectTaskResponseSchema),
    }),
  ),
});
