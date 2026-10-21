import { z } from 'zod';
import { leadEmailSchema, leadPhoneSchema } from './lead-contact.js';
import { MONEY_PARSE_ERROR, normalizeMoneyInput } from './money.js';

const uuid = z.uuid({ error: 'Invalid identifier.' });

export const pipelineStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const pipelineStageOutcomeSchema = z.enum(['NONE', 'WON', 'LOST']);
export const leadPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const leadSourceSchema = z.enum([
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL',
  'SOCIAL',
  'EVENT',
  'PARTNER',
  'OTHER',
]);
export const leadActivityTypeSchema = z.enum([
  'FIRST_CALL',
  'FOLLOW_UP_CALL',
  'MEETING',
  'EMAIL',
  'NOTE',
  'TASK',
  'STAGE_CHANGE',
  'PROPOSAL_CREATED',
  'PROPOSAL_STATUS_CHANGE',
  'LEAD_CONVERTED',
]);
export const clientTypeSchema = z.enum(['INDIVIDUAL', 'COMPANY']);
export const clientStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const proposalDocumentTypeSchema = z.enum(['PROPOSAL', 'QUOTATION']);
export const proposalStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
]);

function formatNormalizedMoneyNumber(value: number): string {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') || '0';
}

const moneyString = z.union([
  z
    .number()
    .refine((value) => Number.isFinite(value) && value >= 0, { message: MONEY_PARSE_ERROR })
    .transform(formatNormalizedMoneyNumber),
  z.string().transform((raw, ctx) => {
    const result = normalizeMoneyInput(raw);
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: result.error });
      return z.NEVER;
    }
    return result.value;
  }),
]);

const quantityString = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, 'Enter a valid quantity.')
  .or(z.number());

const taxRateString = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, 'Enter a valid tax rate.')
  .or(z.number());

const dateOnly = z.iso.date({ error: 'Enter a valid date.' });
const dateTime = z.iso.datetime({ offset: true });

export const createPipelineRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).optional(),
    status: pipelineStatusSchema.optional(),
  })
  .strict();

export const updatePipelineRequestSchema = createPipelineRequestSchema
  .partial()
  .extend({ sortOrder: z.number().int().optional() })
  .strict();

export const createPipelineStageRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    status: pipelineStatusSchema.optional(),
    outcome: pipelineStageOutcomeSchema.optional(),
  })
  .strict();

export const updatePipelineStageRequestSchema = createPipelineStageRequestSchema.partial().strict();

export const deletePipelineStageRequestSchema = z
  .object({
    targetStageId: uuid.optional(),
  })
  .strict();

export const reorderPipelineStagesRequestSchema = z
  .object({
    orderedStageIds: z.array(uuid).min(1),
  })
  .strict();

const leadListQueryShape = {
  pipelineId: uuid.optional(),
  stageId: uuid.optional(),
  assignedAdminId: uuid.optional(),
  priority: leadPrioritySchema.optional(),
  source: leadSourceSchema.optional(),
  search: z.string().max(200).optional(),
  includeArchived: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  kanbanOrder: z.coerce.boolean().optional(),
} as const;

export const leadListQuerySchema = z.object(leadListQueryShape);

const leadListQueryKeys = Object.keys(leadListQueryShape) as (keyof typeof leadListQueryShape)[];

/** Parses list-leads query params and ignores unknown keys (e.g. UI `view` from proxies). */
export function parseLeadListQuery(input: unknown): z.infer<typeof leadListQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const picked: Record<string, unknown> = {};
  for (const key of leadListQueryKeys) {
    if (key in record) picked[key] = record[key];
  }
  return leadListQuerySchema.parse(picked);
}

export const createLeadRequestSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    companyName: z.string().max(160).optional(),
    email: leadEmailSchema,
    phone: leadPhoneSchema,
    website: z.string().max(512).nullable().optional(),
    source: leadSourceSchema.optional(),
    pipelineId: uuid,
    stageId: uuid.optional(),
    assignedAdminId: uuid.nullable().optional(),
    priority: leadPrioritySchema.optional(),
    estimatedValue: moneyString.optional(),
    currency: z.string().length(3).optional(),
    expectedCloseDate: dateOnly.nullable().optional(),
    nextFollowUpDate: dateTime.nullable().optional(),
    description: z.string().max(4000).optional(),
    tags: z.array(z.string().max(64)).max(32).optional(),
  })
  .strict();

export const updateLeadRequestSchema = createLeadRequestSchema
  .partial()
  .extend({ archived: z.boolean().optional() })
  .strict();

export const changeLeadStageRequestSchema = z
  .object({
    stageId: uuid,
    beforeLeadId: uuid.nullable().optional(),
  })
  .strict();

export const createLeadActivityRequestSchema = z
  .object({
    type: leadActivityTypeSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).optional(),
    occurredAt: dateTime,
    dueAt: dateTime.nullable().optional(),
    completedAt: dateTime.nullable().optional(),
    metadata: z.unknown().optional(),
  })
  .strict();

export const createClientRequestSchema = z
  .object({
    type: clientTypeSchema,
    name: z.string().trim().min(1).max(160),
    primaryContact: z.string().max(160).optional(),
    email: z.email().max(254).nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    website: z.string().max(512).nullable().optional(),
    billingAddress: z.string().max(1000).optional(),
    taxRegistration: z.string().max(120).optional(),
    status: clientStatusSchema.optional(),
    notes: z.string().max(4000).optional(),
    sourceLeadId: uuid.nullable().optional(),
  })
  .strict();

export const updateClientRequestSchema = createClientRequestSchema
  .partial()
  .extend({ archived: z.boolean().optional() })
  .strict();

export const proposalLineItemSchema = z
  .object({
    id: uuid.optional(),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    quantity: quantityString,
    unit: z.string().max(32).optional(),
    unitPrice: moneyString,
    discount: moneyString.optional(),
    taxRate: taxRateString.optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

export const createProposalRequestSchema = z
  .object({
    type: proposalDocumentTypeSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).optional(),
    leadId: uuid.nullable().optional(),
    clientId: uuid.nullable().optional(),
    issueDate: dateOnly,
    expiryDate: dateOnly.nullable().optional(),
    currency: z.string().length(3).optional(),
    notes: z.string().max(4000).optional(),
    terms: z.string().max(4000).optional(),
    lineItems: z.array(proposalLineItemSchema).optional(),
  })
  .strict();

export const updateProposalRequestSchema = createProposalRequestSchema
  .omit({ type: true })
  .partial()
  .strict();

export const changeProposalStatusRequestSchema = z
  .object({
    status: proposalStatusSchema,
    note: z.string().max(1000).optional(),
  })
  .strict();

export type CreatePipelineRequest = z.infer<typeof createPipelineRequestSchema>;
export type UpdatePipelineRequest = z.infer<typeof updatePipelineRequestSchema>;
export type CreatePipelineStageRequest = z.infer<typeof createPipelineStageRequestSchema>;
export type UpdatePipelineStageRequest = z.infer<typeof updatePipelineStageRequestSchema>;
export type ReorderPipelineStagesRequest = z.infer<typeof reorderPipelineStagesRequestSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type CreateLeadRequest = z.infer<typeof createLeadRequestSchema>;
export type UpdateLeadRequest = z.infer<typeof updateLeadRequestSchema>;
export type ChangeLeadStageRequest = z.infer<typeof changeLeadStageRequestSchema>;
export type CreateLeadActivityRequest = z.infer<typeof createLeadActivityRequestSchema>;
export type CreateClientRequest = z.infer<typeof createClientRequestSchema>;
export type UpdateClientRequest = z.infer<typeof updateClientRequestSchema>;
export type CreateProposalRequest = z.infer<typeof createProposalRequestSchema>;
export type UpdateProposalRequest = z.infer<typeof updateProposalRequestSchema>;
export type ChangeProposalStatusRequest = z.infer<typeof changeProposalStatusRequestSchema>;
