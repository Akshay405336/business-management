import { TOTP_CODE_LENGTH, platformVerifyTotpRequestSchema } from '@techwin/validation';
import type { z } from 'zod';

export { TOTP_CODE_LENGTH };

export const totpSchema = platformVerifyTotpRequestSchema;

export type TotpFormInput = z.input<typeof totpSchema>;
export type TotpFormValues = z.output<typeof totpSchema>;
