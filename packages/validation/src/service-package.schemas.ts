import { z } from 'zod';
import { MONEY_PARSE_ERROR, normalizeMoneyInput } from './money.js';
import { normalizeGstRatePercent } from './service-package-pricing.js';

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

/** Empty or whitespace discount input is treated as zero (optional discount). */
export const packageDiscountValueInputSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'string' && val.trim() === '') return '0';
    return val;
  },
  moneyString,
);

const percentString = z.union([
  z
    .number()
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 100, {
      message: 'Enter a percentage between 0 and 100.',
    })
    .transform(String),
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid percentage.')
    .transform((raw, ctx) => {
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        ctx.addIssue({ code: 'custom', message: 'Enter a percentage between 0 and 100.' });
        return z.NEVER;
      }
      return raw;
    }),
]);

const loosePercentValue = z.union([
  z
    .number()
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 100, {
      message: 'Enter a percentage between 0 and 100.',
    })
    .transform((value) => normalizeGstRatePercent(value)),
  z.string().trim().transform((raw, ctx) => {
    const normalized = normalizeGstRatePercent(raw);
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      ctx.addIssue({ code: 'custom', message: 'Enter a percentage between 0 and 100.' });
      return z.NEVER;
    }
    return normalized;
  }),
]);

/** Empty or omitted package GST is valid; normalized to null for API payloads. */
export const packageGstRateInputSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  },
  z.union([z.null(), loosePercentValue]),
);

const uuid = z.uuid({ error: 'Invalid identifier.' });

export const servicePackageStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const servicePackageDeliveryUnitSchema = z.enum(['DAYS', 'WEEKS', 'MONTHS']);

export const packageDiscountTypeSchema = z.enum(['FIXED', 'PERCENT']);

export const catalogSelectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160),
  category: z.string().max(80).optional(),
  custom: z.boolean().optional(),
});

export const packageAddOnSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  price: moneyString,
  gstRatePercent: percentString.nullable().optional(),
  taxExempt: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const servicePackageConfigurationSchema = z.object({
  technologyStack: z.array(catalogSelectionSchema).max(200).optional(),
  includedPages: z.array(catalogSelectionSchema).max(200).optional(),
  integrations: z.array(catalogSelectionSchema).max(200).optional(),
  adminPanelFeatures: z.array(catalogSelectionSchema).max(200).optional(),
  hostingDeployment: z.array(catalogSelectionSchema).max(100).optional(),
  deliveryServices: z.array(catalogSelectionSchema).max(100).optional(),
  integrationNotes: z.string().max(4000).optional(),
  pageCount: z.number().int().min(0).max(9999).optional(),
});

const pricingFields = {
  basePrice: moneyString,
  addOns: z.array(packageAddOnSchema).max(50).optional(),
  discountType: packageDiscountTypeSchema,
  discountValue: packageDiscountValueInputSchema,
  gstRatePercent: packageGstRateInputSchema,
};

const deliveryFields = {
  deliveryDurationValue: z.number().int().min(1).max(9999),
  deliveryDurationUnit: servicePackageDeliveryUnitSchema,
};

/** Plain object shape — no object-level refinements (Zod 4 requires .partial() before refinements). */
export const servicePackageRequestObjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a package name.').max(160),
    categories: z
      .array(catalogSelectionSchema)
      .min(1, 'Select at least one package category.')
      .max(30),
    shortDescription: z.string().max(500).optional(),
    detailedDescription: z.string().max(8000).optional(),
    ...pricingFields,
    ...deliveryFields,
    supportPeriod: z.string().max(120).optional(),
    revisionAllowance: z.string().max(120).optional(),
    termsExclusions: z.string().max(4000).optional(),
  })
  .merge(servicePackageConfigurationSchema)
  .strict();

type ServicePackageRequestShape = z.infer<typeof servicePackageRequestObjectSchema>;

const refineCreatePackageDiscount = (data: ServicePackageRequestShape, ctx: z.RefinementCtx) => {
  const base = Number(data.basePrice);
  const discount = Number(data.discountValue);
  if (discount <= 0) return;
  if (data.discountType === 'PERCENT' && discount > 100) {
    ctx.addIssue({
      code: 'custom',
      message: 'Discount percentage cannot exceed 100.',
      path: ['discountValue'],
    });
  }
  if (data.discountType === 'FIXED' && discount > base) {
    ctx.addIssue({
      code: 'custom',
      message: 'Fixed discount cannot exceed the base price.',
      path: ['discountValue'],
    });
  }
};

const refineUpdatePackageDiscount = (
  data: Partial<ServicePackageRequestShape>,
  ctx: z.RefinementCtx,
) => {
  if (data.discountType === 'PERCENT' && data.discountValue !== undefined) {
    const discount = Number(data.discountValue);
    if (discount <= 0) return;
    if (discount > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Discount percentage cannot exceed 100.',
        path: ['discountValue'],
      });
    }
  }
  if (
    data.discountType === 'FIXED' &&
    data.discountValue !== undefined &&
    data.basePrice !== undefined
  ) {
    const discount = Number(data.discountValue);
    if (discount <= 0) return;
    if (discount > Number(data.basePrice)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Fixed discount cannot exceed the base price.',
        path: ['discountValue'],
      });
    }
  }
};

export const createServicePackageRequestSchema = servicePackageRequestObjectSchema.superRefine(
  refineCreatePackageDiscount,
);

export const updateServicePackageRequestSchema = servicePackageRequestObjectSchema
  .partial()
  .strict()
  .superRefine(refineUpdatePackageDiscount);

export const changeServicePackageStatusRequestSchema = z
  .object({
    status: servicePackageStatusSchema,
  })
  .strict();

export type CatalogSelection = z.infer<typeof catalogSelectionSchema>;
export type CreateServicePackageRequest = z.infer<typeof createServicePackageRequestSchema>;
export type UpdateServicePackageRequest = z.infer<typeof updateServicePackageRequestSchema>;
export type ChangeServicePackageStatusRequest = z.infer<
  typeof changeServicePackageStatusRequestSchema
>;
export type ServicePackageDeliveryUnit = z.infer<typeof servicePackageDeliveryUnitSchema>;
