import {
  changeProjectStatusRequestSchema,
  createProjectRequestBodySchema,
  createProjectRequestSchema,
  projectExecutionLifecycleSchema,
  projectLifecyclePhaseSchema,
  projectPhaseInputObjectSchema,
  projectPrioritySchema,
  projectStatusSchema,
  updateProjectRequestBodySchema,
  updateProjectRequestSchema,
} from '@techwin/validation';
import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { z } from 'zod';

/** OpenAPI / docs — create & update bodies are validated in the controller via Zod parse. */
export const createProjectBodySchema = createProjectRequestBodySchema;
export const updateProjectBodySchema = updateProjectRequestBodySchema;
export { createProjectRequestBodySchema, updateProjectRequestBodySchema };

export {
  changeProjectStatusRequestSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
};

type SchemaObject = ApiResponseSchemaHost['schema'];

export const toOpenApiSchema = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;

const projectPhaseResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  phase: projectLifecyclePhaseSchema,
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
  startDate: z.string(),
  expectedEndDate: z.string(),
  ownerAdminId: z.uuid().nullable(),
  sortOrder: z.number().int(),
});

export const projectListItemResponseSchema = z.object({
  id: z.uuid(),
  projectNumber: z.string(),
  name: z.string(),
  clientId: z.uuid(),
  clientName: z.string(),
  companyName: z.string(),
  priority: projectPrioritySchema,
  startDate: z.string(),
  status: projectStatusSchema,
  executionLifecycle: projectExecutionLifecycleSchema,
  actualProductionStartedAt: z.string().nullable(),
  actualCompletedAt: z.string().nullable(),
  phaseCount: z.number().int(),
  progressPercent: z.number().int(),
});

export const projectDetailResponseSchema = projectListItemResponseSchema.extend({
  description: z.string(),
  clientPhone: z.string(),
  clientEmail: z.string(),
  projectManagerAdminId: z.uuid().nullable(),
  projectManagerName: z.string().nullable(),
  expectedEndDate: z.string(),
  currentPhase: projectLifecyclePhaseSchema,
  proposalId: z.uuid().nullable(),
  quotationNumber: z.string(),
  quotationTitle: z.string(),
  acceptedCommercialValue: z.string().nullable(),
  currency: z.string(),
  scopeAndRequirements: z.string(),
  mainDeliverables: z.string(),
  acceptanceCriteria: z.string(),
  internalNotes: z.string(),
  phases: z.array(projectPhaseResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectListResponseSchema = z.object({
  items: z.array(projectListItemResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  tabCounts: z.object({
    all: z.number().int(),
    notPlanned: z.number().int(),
    planned: z.number().int(),
    inProduction: z.number().int(),
    completed: z.number().int(),
  }),
});

export const projectNumberPreviewResponseSchema = z.object({
  projectNumber: z.string(),
  isPreview: z.literal(true),
});

export const projectManagerOptionSchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  email: z.string(),
});

export const clientQuotationOptionSchema = z.object({
  id: z.uuid(),
  documentNumber: z.string(),
  title: z.string(),
  grandTotal: z.string(),
  status: z.string(),
});

export const projectPhaseInputOpenApiSchema = projectPhaseInputObjectSchema;
