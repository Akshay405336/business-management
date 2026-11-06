import { z } from 'zod';

const uuid = z.uuid({ error: 'Invalid identifier.' });

const TAG_COLOR = /^#[0-9a-fA-F]{6}$/;

export function normalizeLeadTagSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'tag';
}

export function formatLeadTagDisplayName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ').slice(0, 64);
  if (!trimmed) return 'Tag';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeLeadTagNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const display = formatLeadTagDisplayName(raw);
    const slug = normalizeLeadTagSlug(display);
    if (seen.has(slug)) continue;
    seen.add(slug);
    result.push(display);
  }
  return result;
}

export const leadTagColorSchema = z
  .string()
  .trim()
  .regex(TAG_COLOR, 'Enter a valid hex color.');

export const LEAD_TAG_PRESET_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#64748b',
] as const;

export const leadTagStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const createLeadTagRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a tag name.').max(64),
    color: leadTagColorSchema.optional(),
    description: z.string().trim().max(255).optional(),
  })
  .strict();

export const updateLeadTagRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    color: leadTagColorSchema.optional(),
    description: z.string().trim().max(255).optional(),
    status: leadTagStatusSchema.optional(),
  })
  .strict();

export const updateLeadTagStatusRequestSchema = z
  .object({
    status: leadTagStatusSchema,
  })
  .strict();

export const listLeadTagsQuerySchema = z
  .object({
    search: z.string().trim().max(64).optional(),
    status: leadTagStatusSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.enum(['name-asc', 'name-desc', 'leads-desc', 'leads-asc', 'created-desc']).optional(),
  })
  .strict();

const listLeadTagsQueryKeys = ['search', 'status', 'page', 'pageSize', 'sort'] as const;

export function parseListLeadTagsQuery(input: unknown) {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const picked: Record<string, unknown> = {};
  for (const key of listLeadTagsQueryKeys) {
    if (key in record) picked[key] = record[key];
  }
  return listLeadTagsQuerySchema.parse(picked);
}

export const leadTagIdParamSchema = z.object({ tagId: uuid }).strict();

export type CreateLeadTagRequest = z.infer<typeof createLeadTagRequestSchema>;
export type UpdateLeadTagRequest = z.infer<typeof updateLeadTagRequestSchema>;
export type UpdateLeadTagStatusRequest = z.infer<typeof updateLeadTagStatusRequestSchema>;
export type ListLeadTagsQuery = z.infer<typeof listLeadTagsQuerySchema>;
export type LeadTagStatus = z.infer<typeof leadTagStatusSchema>;

export const leadTagIdsQuerySchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return value;
  }, z.array(uuid).max(16).optional());
