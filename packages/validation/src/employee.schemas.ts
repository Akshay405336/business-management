import { z } from 'zod';
import { employeeSalaryStructureSchema } from './employee-salary.js';
import { profileImageStoredObjectIdSchema } from './stored-object.js';
import { leadEmailSchema, leadPhoneSchema } from './lead-contact.js';

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
  jobTitle: z.string().trim().min(1, 'Enter a designation.').max(120),
  department: z.string().trim().max(120, 'Department is too long.').nullable().optional(),
  employmentType: employeeEmploymentTypeSchema,
  dateOfJoining: dateOnly,
  probationEndDate: dateOnly.nullable().optional(),
  employmentEndDate: dateOnly.nullable().optional(),
  workLocation: z.string().max(160).nullable().optional(),
  profileImageUrl: z.string().url().max(512).nullable().optional(),
  profileImageStoredObjectId: profileImageStoredObjectIdSchema,
  notes: z.string().max(4000).optional(),
};

export const createEmployeeRequestSchema = z
  .object({
    firstName: employeeContactFields.firstName,
    lastName: z.string().trim().max(80),
    workEmail: employeeContactFields.workEmail,
    phone: employeeContactFields.phone,
    alternatePhone: employeeContactFields.alternatePhone,
    ...employeeEmploymentFields,
    salaryStructure: employeeSalaryStructureSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
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
    department: employeeEmploymentFields.department,
    employmentType: employeeEmploymentFields.employmentType.optional(),
    dateOfJoining: employeeEmploymentFields.dateOfJoining.optional(),
    probationEndDate: employeeEmploymentFields.probationEndDate,
    employmentEndDate: employeeEmploymentFields.employmentEndDate,
    workLocation: employeeEmploymentFields.workLocation,
    profileImageUrl: employeeEmploymentFields.profileImageUrl,
    profileImageStoredObjectId: employeeEmploymentFields.profileImageStoredObjectId,
    notes: employeeEmploymentFields.notes,
    salaryStructure: employeeSalaryStructureSchema.optional(),
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
    employmentType: employeeEmploymentTypeSchema.optional(),
    sortBy: employeeListSortBySchema.optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    /** When true, only employees without a linked sign-in account and eligible for access. */
    accountLinkable: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
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
    'employmentType',
    'sortBy',
    'sortDir',
    'accountLinkable',
  ] as const;
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) picked[key] = record[key];
  }
  return employeeListQuerySchema.parse(picked);
}

export const assignableEmployeeQuerySchema = z
  .object({
    search: z.string().max(200).optional(),
  })
  .strict();

export function parseAssignableEmployeeQuery(
  input: unknown,
): z.infer<typeof assignableEmployeeQuerySchema> {
  const record =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return assignableEmployeeQuerySchema.parse('search' in record ? { search: record.search } : {});
}

export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;
export type UpdateEmployeeRequest = z.infer<typeof updateEmployeeRequestSchema>;
export type ChangeEmployeeStatusRequest = z.infer<typeof changeEmployeeStatusRequestSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
