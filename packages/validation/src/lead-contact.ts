import { z } from 'zod';

export const LEAD_EMAIL_REQUIRED = 'Email is required.' as const;
export const LEAD_EMAIL_INVALID = 'Enter a valid email address.' as const;
export const LEAD_PHONE_REQUIRED = 'Phone number is required.' as const;
export const LEAD_PHONE_INVALID = 'Enter a valid 10-digit Indian mobile number.' as const;

/** Strip +91 / leading 0 and non-digits for Indian mobile validation. */
export function normalizeIndianMobileInput(input: string): string {
  let digits = input.trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export const leadEmailSchema = z
  .string()
  .trim()
  .min(1, LEAD_EMAIL_REQUIRED)
  .pipe(z.email({ error: LEAD_EMAIL_INVALID }))
  .pipe(z.string().max(254).toLowerCase());

export const leadPhoneSchema = z
  .string()
  .trim()
  .min(1, LEAD_PHONE_REQUIRED)
  .transform(normalizeIndianMobileInput)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, LEAD_PHONE_INVALID));
