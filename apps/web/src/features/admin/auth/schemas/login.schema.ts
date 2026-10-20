import { platformLoginRequestSchema } from '@techwin/validation';
import type { z } from 'zod';

/** Same schema the API validates against, so client and server agree. */
export const loginSchema = platformLoginRequestSchema;

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginFormValues = z.output<typeof loginSchema>;
