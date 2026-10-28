import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { API_ERROR_CODES } from '@techwin/contracts';
import {
  changeLeadStageRequestSchema,
  changeProposalStatusRequestSchema,
  createClientRequestSchema,
  createLeadActivityRequestSchema,
  createLeadRequestSchema,
  createPipelineRequestSchema,
  createPipelineStageRequestSchema,
  createProposalRequestSchema,
  deletePipelineStageRequestSchema,
  leadListQuerySchema,
  reorderPipelineStagesRequestSchema,
  updateClientRequestSchema,
  updateLeadRequestSchema,
  updatePipelineRequestSchema,
  updatePipelineStageRequestSchema,
  updateProposalRequestSchema,
  changeServicePackageStatusRequestSchema,
  createServicePackageRequestSchema,
  updateServicePackageRequestSchema,
  catalogSelectionSchema,
} from '@techwin/validation';
import { z } from 'zod';

export const createPipelineBodySchema = createPipelineRequestSchema;
export const updatePipelineBodySchema = updatePipelineRequestSchema;
export const createStageBodySchema = createPipelineStageRequestSchema;
export const updateStageBodySchema = updatePipelineStageRequestSchema;
export const deleteStageBodySchema = deletePipelineStageRequestSchema;
export const reorderStagesBodySchema = reorderPipelineStagesRequestSchema;
export const leadListQuerySchemaOpenApi = leadListQuerySchema;
export const createLeadBodySchema = createLeadRequestSchema;
export const updateLeadBodySchema = updateLeadRequestSchema;
export const changeLeadStageBodySchema = changeLeadStageRequestSchema;
export const createLeadActivityBodySchema = createLeadActivityRequestSchema;
export const createClientBodySchema = createClientRequestSchema;
export const updateClientBodySchema = updateClientRequestSchema;
export const createProposalBodySchema = createProposalRequestSchema;
export const updateProposalBodySchema = updateProposalRequestSchema;
export const changeProposalStatusBodySchema = changeProposalStatusRequestSchema;
export const createServicePackageBodySchema = createServicePackageRequestSchema;
export const updateServicePackageBodySchema = updateServicePackageRequestSchema;
export const changeServicePackageStatusBodySchema = changeServicePackageStatusRequestSchema;
export const servicePackageCodePreviewResponseSchema = z.object({
  code: z.string().regex(/^TECH-PKG-\d{4,}$/),
  isPreview: z.literal(true),
});

const isoDateTime = z.iso.datetime();
const isoDate = z.iso.date();

export const crmPipelineStageResponseSchema = z.object({
  id: z.uuid(),
  pipelineId: z.uuid(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  sortOrder: z.number().int(),
  outcome: z.enum(['NONE', 'WON', 'LOST']),
  leadCount: z.number().int().nonnegative(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const crmPipelineResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  stages: z.array(crmPipelineStageResponseSchema),
});

export const crmPipelineListResponseSchema = z.object({
  pipelines: z.array(crmPipelineResponseSchema),
});

export const crmPipelineBulkActionResponseSchema = z.object({
  succeededIds: z.array(z.uuid()),
  failures: z.array(
    z.object({
      pipelineId: z.uuid(),
      message: z.string(),
    }),
  ),
});

export const crmLeadResponseSchema = z.object({
  id: z.uuid(),
  referenceNumber: z.string(),
  subject: z.string(),
  fullName: z.string(),
  companyName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  source: z.string(),
  pipelineId: z.uuid(),
  stageId: z.uuid(),
  assignedAdminId: z.uuid().nullable(),
  priority: z.string(),
  estimatedValue: z.string(),
  currency: z.string(),
  expectedCloseDate: isoDate.nullable(),
  nextFollowUpDate: isoDateTime.nullable(),
  description: z.string(),
  tags: z.array(z.string()),
  convertedClientId: z.uuid().nullable(),
  convertedAt: isoDateTime.nullable(),
  archivedAt: isoDateTime.nullable(),
  kanbanSortOrder: z.number().int(),
  lastActivityAt: isoDateTime,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const crmLeadListResponseSchema = z.object({
  items: z.array(crmLeadResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const crmLeadActivityResponseSchema = z.object({
  id: z.uuid(),
  leadId: z.uuid(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  occurredAt: isoDateTime,
  dueAt: isoDateTime.nullable(),
  completedAt: isoDateTime.nullable(),
  metadata: z.unknown(),
  createdByAdminId: z.uuid(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const crmClientResponseSchema = z.object({
  id: z.uuid(),
  referenceNumber: z.string(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']),
  name: z.string(),
  primaryContact: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  billingAddress: z.string(),
  taxRegistration: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  notes: z.string(),
  sourceLeadId: z.uuid().nullable(),
  archivedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const crmProposalLineItemResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  sourcePackageId: z.uuid().nullable(),
  description: z.string(),
  quantity: z.string(),
  unit: z.string(),
  unitPrice: z.string(),
  discount: z.string(),
  taxRate: z.string(),
  lineTotal: z.string(),
  sortOrder: z.number().int(),
});

export const crmProposalResponseSchema = z.object({
  id: z.uuid(),
  documentNumber: z.string(),
  type: z.enum(['PROPOSAL', 'QUOTATION']),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']),
  title: z.string(),
  description: z.string(),
  leadId: z.uuid().nullable(),
  clientId: z.uuid().nullable(),
  issueDate: isoDate,
  expiryDate: isoDate.nullable(),
  currency: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  taxTotal: z.string(),
  grandTotal: z.string(),
  notes: z.string(),
  terms: z.string(),
  scopeOfWork: z.string(),
  paymentTerms: z.string(),
  deliveryTimeline: z.string(),
  clientName: z.string(),
  companyName: z.string(),
  clientPhone: z.string(),
  clientEmail: z.string(),
  billingAddress: z.string(),
  clientGstin: z.string(),
  version: z.number().int(),
  sourcePackageId: z.uuid().nullable(),
  packageSnapshot: z.unknown().nullable(),
  lineItems: z.array(crmProposalLineItemResponseSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const catalogSelectionResponseSchema = catalogSelectionSchema;

const packageAddOnResponseSchema = z.object({
  id: z.uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  price: z.string(),
  gstRatePercent: z.string().nullable().optional(),
  taxExempt: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const crmServicePackageResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  categories: z.array(catalogSelectionResponseSchema),
  shortDescription: z.string(),
  detailedDescription: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  technologyStack: z.array(catalogSelectionResponseSchema),
  includedPages: z.array(catalogSelectionResponseSchema),
  integrations: z.array(catalogSelectionResponseSchema),
  adminPanelFeatures: z.array(catalogSelectionResponseSchema),
  hostingDeployment: z.array(catalogSelectionResponseSchema),
  deliveryServices: z.array(catalogSelectionResponseSchema),
  integrationNotes: z.string(),
  pageCount: z.number().int().nullable(),
  basePrice: z.string(),
  addOns: z.array(packageAddOnResponseSchema),
  discountType: z.enum(['FIXED', 'PERCENT']),
  discountValue: z.string(),
  gstRate: z.string(),
  taxableAmount: z.string(),
  gstAmount: z.string(),
  finalPrice: z.string(),
  deliveryDurationValue: z.number().int().nullable(),
  deliveryDurationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS']).nullable(),
  supportPeriod: z.string(),
  revisionAllowance: z.string(),
  termsExclusions: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const crmServicePackageListResponseSchema = z.object({
  packages: z.array(crmServicePackageResponseSchema),
});

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.object({
    code: z.enum(Object.values(API_ERROR_CODES) as [string, ...string[]]),
    message: z.string(),
    requestId: z.string().nullable(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    retryAfterSeconds: z.number().int().optional(),
  }),
});

type SchemaObject = ApiResponseSchemaHost['schema'];

export const toOpenApiSchema = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;
