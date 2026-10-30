import { z } from 'zod';

export const storedObjectCategorySchema = z.enum(['EMPLOYEE_PROFILE_IMAGE']);

export type StoredObjectCategory = z.infer<typeof storedObjectCategorySchema>;

export const profileImageStoredObjectIdSchema = z.string().uuid().nullable().optional();
