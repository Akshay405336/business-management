import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { API_ERROR_CODES } from '@techwin/contracts';
import {
  platformLoginRequestSchema,
  platformSessionIdSchema,
  platformVerifyTotpRequestSchema,
} from '@techwin/validation';
import { z } from 'zod';

/** Request schemas are shared with the web app's form validation. */
export const platformLoginBodySchema = platformLoginRequestSchema;
export const platformVerifyTotpBodySchema = platformVerifyTotpRequestSchema;
export const platformSessionIdParamSchema = platformSessionIdSchema;

const isoDateTime = z.iso.datetime();

export const platformAdminProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  role: z.enum(['SUPER_ADMIN', 'ORGANIZATION_MEMBER']),
  lastLoginAt: isoDateTime.nullable(),
});

export const platformSessionSummarySchema = z.object({
  id: z.uuid(),
  createdAt: isoDateTime,
  lastActiveAt: isoDateTime,
  expiresAt: isoDateTime,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  current: z.boolean(),
});

export const platformAccessTokenResponseSchema = z.object({
  tokenType: z.literal('Bearer'),
  accessToken: z.string(),
  accessTokenExpiresAt: isoDateTime,
  sessionId: z.uuid(),
  sessionExpiresAt: isoDateTime,
});

export const platformVerifyTotpResponseSchema = platformAccessTokenResponseSchema.extend({
  admin: platformAdminProfileSchema,
});

export const platformLoginTotpRequiredResponseSchema = z.object({
  status: z.literal('totp_required'),
  challengeExpiresAt: isoDateTime,
  enrollmentPending: z.boolean(),
});

export const platformLoginAuthenticatedResponseSchema = platformVerifyTotpResponseSchema.extend({
  status: z.literal('authenticated'),
});

export const platformLoginResponseSchema = z.union([
  platformLoginTotpRequiredResponseSchema,
  platformLoginAuthenticatedResponseSchema,
]);

export const platformCurrentSessionResponseSchema = z.object({
  admin: platformAdminProfileSchema,
  session: platformSessionSummarySchema,
});

export const platformSessionListResponseSchema = z.object({
  sessions: z.array(platformSessionSummarySchema),
});

export const platformLogoutAllResponseSchema = z.object({
  revokedSessions: z.number().int().nonnegative(),
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

/** Converts a response schema into an OpenAPI 3.0 schema for Swagger decorators. */
export const toOpenApiSchema = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;
