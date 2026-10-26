import {
  changeEmployeeStatusRequestSchema,
  createEmployeeRequestSchema,
  employeeEmploymentStatusSchema,
  employeeEmploymentTypeSchema,
  updateEmployeeRequestSchema,
} from '@techwin/validation';
import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { z } from 'zod';

export {
  changeEmployeeStatusRequestSchema,
  createEmployeeRequestSchema,
  updateEmployeeRequestSchema,
};

type SchemaObject = ApiResponseSchemaHost['schema'];

export const toOpenApiSchema = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;

const managerSummarySchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  employeeCode: z.string(),
});

export const employeeListItemSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  workEmail: z.string(),
  phone: z.string(),
  jobTitle: z.string(),
  department: z.string(),
  employmentType: employeeEmploymentTypeSchema,
  employmentStatus: employeeEmploymentStatusSchema,
  dateOfJoining: z.string(),
  reportingManager: managerSummarySchema.nullable(),
});

export const employeeListResponseSchema = z.object({
  items: z.array(employeeListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const employeeDetailResponseSchema = employeeListItemSchema.extend({
  alternatePhone: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  probationEndDate: z.string().nullable(),
  employmentEndDate: z.string().nullable(),
  workLocation: z.string().nullable(),
  notes: z.string(),
  platformAdminId: z.uuid().nullable(),
  deactivatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const employeeCodePreviewResponseSchema = z.object({
  employeeCode: z.string(),
  isPreview: z.literal(true),
});

export const employeeManagerOptionsResponseSchema = z.object({
  managers: z.array(managerSummarySchema),
});
