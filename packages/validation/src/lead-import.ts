import { z } from 'zod';
import {
  coalesceOptionalEmailField,
  leadPhoneSchema,
  optionalLeadEmailSchema,
} from './lead-contact.js';
const leadPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const leadSourceSchema = z.enum([
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL',
  'SOCIAL',
  'EVENT',
  'PARTNER',
  'OTHER',
]);
import { normalizeMoneyInput } from './money.js';

const uuid = z.uuid({ error: 'Invalid identifier.' });

export const LEAD_IMPORT_MAX_ROWS = 500;

export const leadImportFieldKeySchema = z.enum([
  'fullName',
  'phone',
  'email',
  'stage',
  'priority',
  'source',
  'tags',
  'estimatedValue',
  'description',
  'skip',
]);

export type LeadImportFieldKey = z.infer<typeof leadImportFieldKeySchema>;

export const leadImportRowInputSchema = z
  .object({
    rowNumber: z.number().int().min(1),
    fullName: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.preprocess(coalesceOptionalEmailField, optionalLeadEmailSchema),
    stage: z.string().trim().max(120).optional(),
    priority: leadPrioritySchema.optional(),
    source: leadSourceSchema.optional(),
    tags: z.array(z.string().max(64)).max(32).optional(),
    estimatedValue: z.string().trim().max(32).optional(),
    description: z.string().max(4000).optional(),
  })
  .strict();

export const validateLeadImportRequestSchema = z
  .object({
    pipelineId: uuid,
    rows: z.array(leadImportRowInputSchema).min(1).max(LEAD_IMPORT_MAX_ROWS),
  })
  .strict();

export const executeLeadImportRequestSchema = validateLeadImportRequestSchema;

export function parseLeadImportEstimatedValue(raw: string | undefined): string {
  if (!raw?.trim()) return '0';
  const result = normalizeMoneyInput(raw);
  if (!result.success) return '0';
  return result.value;
}

export function parseLeadImportPhone(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const parsed = leadPhoneSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
