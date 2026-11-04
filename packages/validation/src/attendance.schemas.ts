import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const timeMinutes = z.number().int().min(0).max(24 * 60 - 1);

const dayScheduleSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    startMinutes: timeMinutes,
    endMinutes: timeMinutes,
  })
  .refine((v) => v.endMinutes > v.startMinutes, {
    message: 'Day end must be after day start.',
    path: ['endMinutes'],
  });

export const upsertAttendanceSettingsRequestSchema = z
  .object({
    effectiveFrom: dateString,
    timeZone: z.string().min(1).max(64),
    officeStartMinutes: timeMinutes,
    officeEndMinutes: timeMinutes,
    lateGraceMinutes: z.number().int().min(0).max(240),
    attendanceCutoffMinutes: timeMinutes,
    minFullDayMinutes: z.number().int().min(1).max(24 * 60),
    minHalfDayMinutes: z.number().int().min(1).max(24 * 60),
    weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([]),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1),
    daySchedules: z.array(dayScheduleSchema).default([]),
    earlyPunchInAllowanceMinutes: z.number().int().min(0).max(480).default(0),
    requireRegisteredDevice: z.boolean().default(false),
    ipAllowlist: z.array(z.string().max(64)).default([]),
    allowPunchOutAfterOfficeEnd: z.boolean().default(true),
  })
  .refine((v) => v.officeEndMinutes > v.officeStartMinutes, {
    message: 'Office end must be after office start.',
    path: ['officeEndMinutes'],
  })
  .refine((v) => v.minFullDayMinutes >= v.minHalfDayMinutes, {
    message: 'Full-day minimum must be at least half-day minimum.',
    path: ['minFullDayMinutes'],
  })
  .refine((v) => v.attendanceCutoffMinutes >= v.officeStartMinutes, {
    message: 'Attendance cutoff must be on or after office start.',
    path: ['attendanceCutoffMinutes'],
  });

export type UpsertAttendanceSettingsRequest = z.infer<typeof upsertAttendanceSettingsRequestSchema>;

export const punchAttendanceRequestSchema = z.object({
  deviceKey: z.string().min(8).max(128).optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
});

export type PunchAttendanceRequest = z.infer<typeof punchAttendanceRequestSchema>;

export const registerAttendanceDeviceRequestSchema = z.object({
  deviceKey: z.string().min(16).max(128),
  label: z.string().max(120).default(''),
});

export type RegisterAttendanceDeviceRequest = z.infer<typeof registerAttendanceDeviceRequestSchema>;

export const correctAttendanceRecordRequestSchema = z
  .object({
    reason: z.string().min(3).max(2000),
    punchInAt: z.string().datetime().nullable().optional(),
    punchOutAt: z.string().datetime().nullable().optional(),
    status: z
      .enum(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'PENDING'])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.punchInAt && value.punchOutAt) {
      const punchIn = new Date(value.punchInAt);
      const punchOut = new Date(value.punchOutAt);
      if (punchOut.getTime() <= punchIn.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Punch out must be after punch in.',
          path: ['punchOutAt'],
        });
      }
    }
  });

export type CorrectAttendanceRecordRequest = z.infer<typeof correctAttendanceRecordRequestSchema>;

export const createAttendanceRecordRequestSchema = z
  .object({
    employeeId: z.string().uuid(),
    attendanceDate: dateString,
    reason: z.string().min(3).max(2000),
    punchInAt: z.string().datetime().nullable().optional(),
    punchOutAt: z.string().datetime().nullable().optional(),
    status: z
      .enum(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'PENDING'])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.punchInAt && value.punchOutAt) {
      const punchIn = new Date(value.punchInAt);
      const punchOut = new Date(value.punchOutAt);
      if (punchOut.getTime() <= punchIn.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Punch out must be after punch in.',
          path: ['punchOutAt'],
        });
      }
    }
  });

export type CreateAttendanceRecordRequest = z.infer<typeof createAttendanceRecordRequestSchema>;

const attendanceStatusFilter = z.enum([
  'PRESENT',
  'LATE',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKLY_OFF',
  'PENDING',
]);

export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  date: dateString.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().max(120).optional(),
  status: attendanceStatusFilter.optional(),
  lateOnly: z.coerce.boolean().optional(),
  absentOnly: z.coerce.boolean().optional(),
  search: z.string().max(120).optional(),
});

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;

export const attendanceHistoryQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  date: dateString.optional(),
  status: attendanceStatusFilter.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;

export const attendanceSummaryQuerySchema = z.object({
  from: dateString,
  to: dateString,
});

export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;

export function parseAttendanceListQuery(input: unknown): AttendanceListQuery {
  return attendanceListQuerySchema.parse(input);
}

export function parseAttendanceHistoryQuery(input: unknown): AttendanceHistoryQuery {
  return attendanceHistoryQuerySchema.parse(input);
}

export function parseAttendanceSummaryQuery(input: unknown): AttendanceSummaryQuery {
  return attendanceSummaryQuerySchema.parse(input);
}

export const attendanceCalendarQuerySchema = z.object({
  from: dateString,
  to: dateString,
  search: z.string().max(120).optional(),
  status: attendanceStatusFilter.optional(),
});

export type AttendanceCalendarQuery = z.infer<typeof attendanceCalendarQuerySchema>;

export function parseAttendanceCalendarQuery(input: unknown): AttendanceCalendarQuery {
  return attendanceCalendarQuerySchema.parse(input);
}
