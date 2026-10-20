import { z } from 'zod';

export const PLATFORM_PASSWORD_MIN_LENGTH = 12;
export const PLATFORM_PASSWORD_MAX_LENGTH = 128;
export const TOTP_CODE_LENGTH = 6;

/** Trims and lower-cases an email before validating it. */
export const platformEmailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }));

/**
 * Login only checks presence and an upper bound; the strength policy applies
 * when a password is set, so existing credentials are never rejected early.
 */
export const platformLoginPasswordSchema = z
  .string({ error: 'Password is required.' })
  .min(1, 'Password is required.')
  .max(PLATFORM_PASSWORD_MAX_LENGTH, 'Password is too long.');

export const platformNewPasswordSchema = z
  .string()
  .min(
    PLATFORM_PASSWORD_MIN_LENGTH,
    `Password must be at least ${PLATFORM_PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(PLATFORM_PASSWORD_MAX_LENGTH, 'Password is too long.')
  .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value), {
    message: 'Password must contain upper- and lower-case letters.',
  })
  .refine((value) => /\d/.test(value), { message: 'Password must contain a digit.' })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: 'Password must contain a symbol.',
  });

export const totpCodeSchema = z
  .string({ error: 'Enter the 6-digit code.' })
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.');

export const platformLoginRequestSchema = z
  .object({
    email: platformEmailSchema,
    password: platformLoginPasswordSchema,
  })
  .strict();

export const platformVerifyTotpRequestSchema = z
  .object({
    code: totpCodeSchema,
  })
  .strict();

export const platformSessionIdSchema = z.uuid({ error: 'Invalid session identifier.' });

export type PlatformLoginRequest = z.infer<typeof platformLoginRequestSchema>;
export type PlatformVerifyTotpRequest = z.infer<typeof platformVerifyTotpRequestSchema>;
