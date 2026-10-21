import { z } from 'zod';
import { leadEmailSchema, leadPhoneSchema } from './lead-contact.js';

export const LEAD_FULL_NAME_REQUIRED = 'Enter a name.' as const;

export const leadFullNameFieldSchema = z
  .string()
  .trim()
  .min(1, LEAD_FULL_NAME_REQUIRED)
  .max(160);

export const pipelineStageNameFieldSchema = z
  .string()
  .trim()
  .min(1, 'Enter a stage name.')
  .max(120);

export const pipelineStageColorFieldSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Select a color.');

export const clientNameFieldSchema = z.string().trim().min(1, 'Enter a name.').max(160);

export { leadEmailSchema, leadPhoneSchema };
