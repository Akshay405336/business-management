import { z } from 'zod';
import { leadEmailSchema, leadPhoneSchema } from './lead-contact.js';

const uuid = z.string().uuid();

export const employeeEmploymentStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'TERMINATED',
]);

export const employeeEmploymentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
]);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date (YYYY-MM-DD).');

const employeeContactFields = {
  firstName: z.string().trim().min(1, 'Enter a first name.').max(80),
  lastName: z.string().trim().min(1, 'Enter a last name.').max(80),
  workEmail: leadEmailSchema,
  phone: leadPhoneSchema,
  alternatePhone: leadPhoneSchema.nullable().optional(),
};

const employeeEmploymentFields = {
  jobTitle: z.string().trim().min(1, 'Enter a job title.').max(120),
  department: z.string().trim().min(1, 'Enter a department.').max(120),
  employmentType: employeeEmploymentTypeSchema,
  dateOfJoining: dateOnly,
  probationEndDate: dateOnly.nullable().optional(),
  employmentEndDate: dateOnly.nullable().optional(),
  workLocation: z.string().max(160).nullable().optional(),
  reportingManagerId: uuid.nullable().optional(),
  profileImageUrl: z.string().url().max(512).nullable().optional(),
  notes: z.string().max(4000).optional(),
  platformAdminId: uuid.nullable().optional(),
};

export const createEmployeeRequestSchema = z
  .object({
    ...employeeContactFields,
    ...employeeEmploymentFields,
    employmentStatus: employeeEmploymentStatusSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.employmentStatus === 'TERMINATED') {
      ctx.addIssue({
        code: 'custom',
        path: ['employmentStatus'],
        message: 'New employees cannot be created with a terminated status.',
      });
    }
    if (value.probationEndDate && value.probationEndDate < value.dateOfJoining) {
      ctx.addIssue({
        code: 'custom',
        path: ['probationEndDate'],
        message: 'Probation end date must be on or after the date of joining.',
      });
    }
    if (value.employmentEndDate && value.employmentEndDate < value.dateOfJoining) {
      ctx.addIssue({
        code: 'custom',
        path: ['employmentEndDate'],
        message: 'Employment end date must be on or after the date of joining.',
      });
    }
  });

const updateEmployeeFieldsSchema = z
  .object({
    firstName: employeeContactFields.firstName.optional(),
    lastName: employeeContactFields.lastName.optional(),
    workEmail: employeeContactFields.workEmail.optional(),
    phone: employeeContactFields.phone.optional(),
    alternatePhone: employeeContactFields.alternatePhone,
    jobTitle: employeeEmploymentFields.jobTitle.optional(),
    department: employeeEmploymentFields.department.optional(),
    employmentType: employeeEmploymentFields.employmentType.optional(),
    dateOfJoining: employeeEmploymentFields.dateOfJoining.optional(),
    probationEndDate: employeeEmploymentFields.probationEndDate,
    employmentEndDate: employeeEmploymentFields.employmentEndDate,
    workLocation: employeeEmploymentFields.workLocation,
    reportingManagerId: employeeEmploymentFields.reportingManagerId,
    profileImageUrl: employeeEmploymentFields.profileImageUrl,
    notes: employeeEmploymentFields.notes,
    platformAdminId: employeeEmploymentFields.platformAdminId,
  })
  .strict();

export const updateEmployeeRequestSchema = updateEmployeeFieldsSchema.superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({ code: 'custom', path: [], message: 'Provide at least one field to update.' });
  }
});

export const changeEmployeeStatusRequestSchema = z
  .object({
    status: employeeEmploymentStatusSchema,
  })
  .strict();

export const employeeListSortBySchema = z.enum([
  'displayName',
  'employeeCode',
  'dateOfJoining',
  'updatedAt',
]);

export const employeeListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().max(200).optional(),
    status: employeeEmploymentStatusSchema.optional(),
    department: z.string().max(120).optional(),
    employmentType: employeeEmploymentTypeSchema.optional(),
    sortBy: employeeListSortBySchema.optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export function parseEmployeeListQuery(input: unknown): z.infer<typeof employeeListQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const keys = [
    'page',
    'pageSize',
    'search',
    'status',
    'department',
    'employmentType',
    'sortBy',
    'sortDir',
  ] as const;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) picked[key] = record[key];
  }
  return employeeListQuerySchema.parse(picked);
}

export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;
export type UpdateEmployeeRequest = z.infer<typeof updateEmployeeRequestSchema>;
export type ChangeEmployeeStatusRequest = z.infer<typeof changeEmployeeStatusRequestSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
