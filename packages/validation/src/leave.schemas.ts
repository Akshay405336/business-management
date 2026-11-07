import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

const leaveTypeNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a leave type name.')
  .max(120, 'Leave type name must be 120 characters or fewer.');

const leaveTypeDescriptionValueSchema = z
  .string()
  .max(2000, 'Description must be 2000 characters or fewer.')
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

const leaveTypeKindSchema = z.enum(['PAID', 'UNPAID']);

const leaveDaysSchema = z
  .union([
    z.number().finite().min(0).max(9999.9),
    z
      .string()
      .trim()
      .regex(/^\d+(\.5)?$/, 'Enter a valid leave day amount (half-day steps).'),
  ])
  .transform((value) => (typeof value === 'number' ? String(value) : value));

const leaveTypeStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const leaveAccrualMethodSchema = z.enum(['ANNUAL_FULL', 'MONTHLY', 'PRORATED_JOIN', 'NONE']);
const leaveAllocationEligibilitySchema = z.enum([
  'ALL_EMPLOYEES',
  'SELECTED_EMPLOYEES',
  'SELECTED_DEPARTMENTS',
  'SELECTED_EMPLOYMENT_TYPES',
]);
const leaveHalfDaySessionSchema = z.enum(['FIRST_HALF', 'SECOND_HALF']);
const leaveRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const createLeaveTypeRequestSchema = z
  .object({
    name: leaveTypeNameSchema,
    description: leaveTypeDescriptionValueSchema.nullish().transform((value) => value ?? null),
    kind: leaveTypeKindSchema,
  })
  .strict();

export type CreateLeaveTypeRequest = z.infer<typeof createLeaveTypeRequestSchema>;

export const updateLeaveTypeRequestSchema = z
  .object({
    name: leaveTypeNameSchema.optional(),
    description: z
      .union([leaveTypeDescriptionValueSchema, z.null()])
      .optional(),
    kind: leaveTypeKindSchema.optional(),
  })
  .strict();

export type UpdateLeaveTypeRequest = z.infer<typeof updateLeaveTypeRequestSchema>;

export const changeLeaveTypeStatusRequestSchema = z
  .object({
    status: leaveTypeStatusSchema,
  })
  .strict();

export type ChangeLeaveTypeStatusRequest = z.infer<typeof changeLeaveTypeStatusRequestSchema>;

export const leaveTypeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(120).optional(),
  status: leaveTypeStatusSchema.optional(),
  kind: leaveTypeKindSchema.optional(),
});

export type LeaveTypeListQuery = z.infer<typeof leaveTypeListQuerySchema>;

const leaveBalanceAllocationLineSchema = z
  .object({
    leaveTypeId: z.string().uuid(),
    annualAllocationDays: leaveDaysSchema,
  })
  .strict();

export const createLeaveYearConfigurationRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name.').max(120).optional(),
    calendarYear: z.number().int().min(2000).max(2100),
    yearStartDate: dateString,
    yearEndDate: dateString,
  })
  .strict()
  .refine((v) => v.yearEndDate >= v.yearStartDate, {
    message: 'Year end must be on or after year start.',
    path: ['yearEndDate'],
  });

export const createLeaveBalanceConfigurationRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name.').max(120),
    yearStartDate: dateString,
    yearEndDate: dateString,
    allocations: z.array(leaveBalanceAllocationLineSchema).min(1, 'Add at least one leave type.'),
  })
  .strict()
  .refine((v) => v.yearEndDate >= v.yearStartDate, {
    message: 'Effective To must be on or after Effective From.',
    path: ['yearEndDate'],
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < value.allocations.length; i += 1) {
      const id = value.allocations[i]?.leaveTypeId;
      if (!id) continue;
      if (seen.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['allocations', i, 'leaveTypeId'],
          message: 'Each leave type can only be added once.',
        });
      }
      seen.add(id);
    }
  });

export type CreateLeaveBalanceConfigurationRequest = z.infer<
  typeof createLeaveBalanceConfigurationRequestSchema
>;

export const updateLeaveBalanceConfigurationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    yearStartDate: dateString.optional(),
    yearEndDate: dateString.optional(),
    allocations: z.array(leaveBalanceAllocationLineSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (v) => !v.yearStartDate || !v.yearEndDate || v.yearEndDate >= v.yearStartDate,
    { message: 'Effective To must be on or after Effective From.', path: ['yearEndDate'] },
  )
  .superRefine((value, ctx) => {
    if (!value.allocations) return;
    const seen = new Set<string>();
    for (let i = 0; i < value.allocations.length; i += 1) {
      const id = value.allocations[i]?.leaveTypeId;
      if (!id) continue;
      if (seen.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['allocations', i, 'leaveTypeId'],
          message: 'Each leave type can only be added once.',
        });
      }
      seen.add(id);
    }
  });

export type UpdateLeaveBalanceConfigurationRequest = z.infer<
  typeof updateLeaveBalanceConfigurationRequestSchema
>;

export type CreateLeaveYearConfigurationRequest = z.infer<
  typeof createLeaveYearConfigurationRequestSchema
>;

export const updateLeaveYearConfigurationRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    yearStartDate: dateString.optional(),
    yearEndDate: dateString.optional(),
  })
  .strict()
  .refine(
    (v) => !v.yearStartDate || !v.yearEndDate || v.yearEndDate >= v.yearStartDate,
    { message: 'Year end must be on or after year start.', path: ['yearEndDate'] },
  );

export type UpdateLeaveYearConfigurationRequest = z.infer<
  typeof updateLeaveYearConfigurationRequestSchema
>;

export const leaveYearConfigurationQuerySchema = z.object({
  calendarYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type LeaveYearConfigurationQuery = z.infer<typeof leaveYearConfigurationQuerySchema>;

export const updateLeaveYearConfigurationStatusRequestSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export type UpdateLeaveYearConfigurationStatusRequest = z.infer<
  typeof updateLeaveYearConfigurationStatusRequestSchema
>;

const allocationBodyFields = {
  leaveTypeId: z.string().uuid(),
  annualAllocationDays: leaveDaysSchema,
  accrualMethod: leaveAccrualMethodSchema.default('ANNUAL_FULL'),
  carryForwardEnabled: z.boolean().default(false),
  maxCarryForwardDays: leaveDaysSchema.default('0'),
  eligibility: leaveAllocationEligibilitySchema.default('ALL_EMPLOYEES'),
  eligibleEmployeeIds: z.array(z.string().uuid()).default([]),
  eligibleDepartments: z.array(z.string().trim().min(1).max(120)).default([]),
  eligibleEmploymentTypes: z
    .array(z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']))
    .default([]),
  effectiveFrom: dateString,
  effectiveTo: dateString.nullable().optional(),
  isActive: z.boolean().default(true),
};

export const createLeaveYearAllocationRequestSchema = z
  .object({
    leaveYearConfigurationId: z.string().uuid(),
    ...allocationBodyFields,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'Effective end must be on or after effective start.',
      });
    }
    if (value.eligibility === 'SELECTED_EMPLOYEES' && value.eligibleEmployeeIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['eligibleEmployeeIds'],
        message: 'Select at least one employee.',
      });
    }
    if (value.eligibility === 'SELECTED_DEPARTMENTS' && value.eligibleDepartments.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['eligibleDepartments'],
        message: 'Select at least one department.',
      });
    }
    if (value.eligibility === 'SELECTED_EMPLOYMENT_TYPES' && value.eligibleEmploymentTypes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['eligibleEmploymentTypes'],
        message: 'Select at least one employment type.',
      });
    }
  });

export type CreateLeaveYearAllocationRequest = z.infer<typeof createLeaveYearAllocationRequestSchema>;

export const updateLeaveYearAllocationRequestSchema = z
  .object(allocationBodyFields)
  .partial()
  .strict();

export type UpdateLeaveYearAllocationRequest = z.infer<typeof updateLeaveYearAllocationRequestSchema>;

export const leaveAllocationListQuerySchema = z.object({
  leaveYearConfigurationId: z.string().uuid().optional(),
  calendarYear: z.coerce.number().int().min(2000).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  activeOnly: z.coerce.boolean().optional(),
});

export type LeaveAllocationListQuery = z.infer<typeof leaveAllocationListQuerySchema>;

export const employeeLeaveBalanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  calendarYear: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  search: z.string().max(120).optional(),
});

export type EmployeeLeaveBalanceListQuery = z.infer<typeof employeeLeaveBalanceListQuerySchema>;

export const adjustEmployeeLeaveBalanceRequestSchema = z
  .object({
    direction: z.enum(['CREDIT', 'DEBIT']),
    days: leaveDaysSchema,
    reason: z.string().trim().min(3, 'Enter a reason.').max(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Number(value.days) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Days must be greater than zero.' });
    }
  });

export type AdjustEmployeeLeaveBalanceRequest = z.infer<typeof adjustEmployeeLeaveBalanceRequestSchema>;

export const leaveBalanceTransactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  employeeId: z.string().uuid().optional(),
  calendarYear: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeLeaveBalanceId: z.string().uuid().optional(),
});

export type LeaveBalanceTransactionListQuery = z.infer<typeof leaveBalanceTransactionListQuerySchema>;

const selectedDatesField = z
  .array(dateString)
  .min(1, 'Select at least one leave date.')
  .max(366, 'Too many leave dates selected.');

export const applyLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().uuid(),
    selectedDates: selectedDatesField.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    isHalfDay: z.boolean().default(false),
    halfDaySession: leaveHalfDaySessionSchema.nullable().optional(),
    halfDayDate: dateString.nullable().optional(),
    reason: z.string().trim().min(3, 'Enter a reason.').max(4000),
    notes: z.string().max(2000).default(''),
    attachmentStoredObjectId: z.string().uuid().nullable().optional(),
    idempotencyKey: z.string().min(8).max(64).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasSelected = (value.selectedDates?.length ?? 0) > 0;
    const hasRange = Boolean(value.startDate && value.endDate);
    if (!hasSelected && !hasRange) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedDates'],
        message: 'Select at least one leave date.',
      });
      return;
    }
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after start date.',
      });
    }
    if (hasSelected) {
      const unique = new Set(value.selectedDates!);
      if (unique.size !== value.selectedDates!.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['selectedDates'],
          message: 'Duplicate leave dates are not allowed.',
        });
      }
    }
    if (value.isHalfDay && !value.halfDaySession) {
      ctx.addIssue({
        code: 'custom',
        path: ['halfDaySession'],
        message: 'Select a half-day session.',
      });
    }
    if (value.isHalfDay) {
      const explicitSelected = value.selectedDates ?? [];
      if (explicitSelected.length > 1) {
        if (!value.halfDayDate) {
          ctx.addIssue({
            code: 'custom',
            path: ['halfDayDate'],
            message: 'Select which date is the half-day when multiple dates are selected.',
          });
        } else if (!explicitSelected.includes(value.halfDayDate)) {
          ctx.addIssue({
            code: 'custom',
            path: ['halfDayDate'],
            message: 'Half-day date must be one of the selected leave dates.',
          });
        }
      } else if (
        value.halfDayDate &&
        explicitSelected.length === 1 &&
        value.halfDayDate !== explicitSelected[0]
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['halfDayDate'],
          message: 'Half-day date must match the selected leave date.',
        });
      }
      if (!hasSelected && value.startDate !== value.endDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'Half-day leave must use a single date (legacy range API).',
        });
      }
    }
  });

export type ApplyLeaveRequest = z.infer<typeof applyLeaveRequestSchema>;

export function parseApplyLeaveRequest(input: unknown): ApplyLeaveRequest {
  return applyLeaveRequestSchema.parse(input);
}

const selectedDatesQueryField = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return value;
  },
  z.array(dateString).min(1).max(366).optional(),
);

export const previewLeaveDaysQuerySchema = z
  .object({
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    selectedDates: selectedDatesQueryField,
    isHalfDay: z.coerce.boolean().default(false),
    halfDayDate: dateString.optional(),
    leaveTypeId: z.string().uuid().optional(),
    skipDuration: z.coerce.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.skipDuration) return;
    const hasSelected = (value.selectedDates?.length ?? 0) > 0;
    const hasRange = Boolean(value.startDate && value.endDate);
    if (!hasSelected && !hasRange) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedDates'],
        message: 'Provide selectedDates or a start/end range.',
      });
      return;
    }
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after start date.',
      });
    }
    if (value.isHalfDay && hasSelected && (value.selectedDates?.length ?? 0) > 1 && !value.halfDayDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['halfDayDate'],
        message: 'Select which date is the half-day.',
      });
    }
  });

export type PreviewLeaveDaysQuery = z.infer<typeof previewLeaveDaysQuerySchema>;

export const leaveRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: leaveRequestStatusSchema.optional(),
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  calendarYear: z.coerce.number().int().min(2000).max(2100).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  search: z.string().max(120).optional(),
});

export type LeaveRequestListQuery = z.infer<typeof leaveRequestListQuerySchema>;

export const rejectLeaveRequestSchema = z.object({
  rejectionReason: z.string().trim().min(3, 'Enter a rejection reason.').max(2000),
});

export type RejectLeaveRequestRequest = z.infer<typeof rejectLeaveRequestSchema>;

export const cancelLeaveRequestSchema = z
  .object({
    reason: z.string().trim().max(2000).default(''),
  })
  .strict();

export type CancelLeaveRequestRequest = z.infer<typeof cancelLeaveRequestSchema>;

export function parseLeaveTypeListQuery(input: unknown): LeaveTypeListQuery {
  return leaveTypeListQuerySchema.parse(input);
}

export function parseLeaveYearConfigurationQuery(input: unknown): LeaveYearConfigurationQuery {
  return leaveYearConfigurationQuerySchema.parse(input);
}

export function parseLeaveAllocationListQuery(input: unknown): LeaveAllocationListQuery {
  return leaveAllocationListQuerySchema.parse(input);
}

export function parseEmployeeLeaveBalanceListQuery(input: unknown): EmployeeLeaveBalanceListQuery {
  return employeeLeaveBalanceListQuerySchema.parse(input);
}

export function parseLeaveBalanceTransactionListQuery(input: unknown): LeaveBalanceTransactionListQuery {
  return leaveBalanceTransactionListQuerySchema.parse(input);
}

export function parseLeaveRequestListQuery(input: unknown): LeaveRequestListQuery {
  return leaveRequestListQuerySchema.parse(input);
}

export function parsePreviewLeaveDaysQuery(input: unknown): PreviewLeaveDaysQuery {
  return previewLeaveDaysQuerySchema.parse(input);
}
