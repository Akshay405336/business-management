import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const eventTypeSchema = z.enum([
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'WEEKLY_OFF',
  'SPECIAL_WORKING_DAY',
  'HALF_WORKING_DAY',
  'OFFICE_CLOSURE',
  'COMPANY_EVENT',
  'OPTIONAL_HOLIDAY',
  'CUSTOM',
]);

const recurrenceSchema = z.enum(['NONE', 'ANNUAL']);

const timeMinutes = z.number().int().min(0).max(24 * 60 - 1);

export const orgCalendarEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).default(''),
    eventType: eventTypeSchema,
    startDate: dateString,
    endDate: dateString,
    isFullDay: z.boolean().default(true),
    startTimeMinutes: timeMinutes.nullable().optional(),
    endTimeMinutes: timeMinutes.nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#64748b'),
    isActive: z.boolean().default(true),
    appliesToAllEmployees: z.boolean().default(true),
    employeeIds: z.array(z.string().uuid()).default([]),
    recurrence: recurrenceSchema.default('NONE'),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after start date.',
    path: ['endDate'],
  })
  .refine(
    (v) => {
      if (v.isFullDay) return true;
      return v.startTimeMinutes != null && v.endTimeMinutes != null && v.endTimeMinutes > v.startTimeMinutes;
    },
    { message: 'Partial-day events require valid start and end times.', path: ['startTimeMinutes'] },
  )
  .refine(
    (v) => v.appliesToAllEmployees || v.employeeIds.length > 0,
    { message: 'Select employees or apply to all employees.', path: ['employeeIds'] },
  );

export type OrgCalendarEventBody = z.infer<typeof orgCalendarEventBodySchema>;

export const createOrgCalendarEventRequestSchema = orgCalendarEventBodySchema;
export type CreateOrgCalendarEventRequest = OrgCalendarEventBody;

export const updateOrgCalendarEventRequestSchema = orgCalendarEventBodySchema;
export type UpdateOrgCalendarEventRequest = OrgCalendarEventBody;

export function parseOrgCalendarListQuery(raw: Record<string, unknown>): {
  from: string;
  to: string;
  eventTypes?: string[];
  search?: string;
  page: number;
  pageSize: number;
  activeOnly: boolean;
} {
  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(raw.pageSize ?? 25) || 25));
  const from = typeof raw.from === 'string' ? raw.from : '';
  const to = typeof raw.to === 'string' ? raw.to : '';
  if (!dateString.safeParse(from).success || !dateString.safeParse(to).success) {
    throw new Error('Invalid date range.');
  }
  const eventTypes =
    typeof raw.eventTypes === 'string' && raw.eventTypes.length > 0
      ? raw.eventTypes.split(',').map((s) => s.trim())
      : undefined;
  const search = typeof raw.search === 'string' ? raw.search.trim() : undefined;
  const activeOnly = raw.activeOnly !== 'false' && raw.includeInactive !== 'true';
  return { from, to, eventTypes, search, page, pageSize, activeOnly };
}

export function parseOrgCalendarMonthQuery(raw: Record<string, unknown>): {
  year: number;
  month: number;
  eventTypes?: string[];
  search?: string;
} {
  const year = Number(raw.year);
  const month = Number(raw.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid year.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid month.');
  }
  const eventTypes =
    typeof raw.eventTypes === 'string' && raw.eventTypes.length > 0
      ? raw.eventTypes.split(',').map((s) => s.trim())
      : undefined;
  const search = typeof raw.search === 'string' ? raw.search.trim() : undefined;
  return { year, month, eventTypes, search };
}

export function parseOrgCalendarHolidaysQuery(raw: Record<string, unknown>): {
  year?: number;
  eventTypes?: string[];
  search?: string;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(raw.pageSize ?? 25) || 25));
  const year =
    raw.year != null && raw.year !== '' ? Number(raw.year) : undefined;
  if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    throw new Error('Invalid year.');
  }
  const eventTypes =
    typeof raw.eventTypes === 'string' && raw.eventTypes.length > 0
      ? raw.eventTypes.split(',').map((s) => s.trim())
      : undefined;
  const search = typeof raw.search === 'string' ? raw.search.trim() : undefined;
  return { year, eventTypes, search, page, pageSize };
}

export const duplicateOrgCalendarHolidaysRequestSchema = z.object({
  sourceYear: z.number().int().min(2000).max(2100),
  targetYear: z.number().int().min(2000).max(2100),
  eventTypes: z.array(eventTypeSchema).optional(),
});

export type DuplicateOrgCalendarHolidaysRequest = z.infer<
  typeof duplicateOrgCalendarHolidaysRequestSchema
>;
