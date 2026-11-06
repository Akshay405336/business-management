import { z } from 'zod';

export const taskCalendarPageSearchSchema = z
  .object({
    month: z.string().optional(),
    search: z.string().optional(),
    employeeId: z.string().uuid().optional(),
    type: z.enum(['GENERAL', 'PROJECT']).optional(),
    source: z.enum(['DAILY_TASK', 'PROJECT_TASK']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.string().min(1).max(64).optional(),
    displayStatus: z.enum(['OPEN', 'IN_PROGRESS', 'REVIEW', 'ON_HOLD', 'COMPLETED']).optional(),
  })
  .strict();

export type TaskCalendarPageSearch = z.infer<typeof taskCalendarPageSearchSchema>;
