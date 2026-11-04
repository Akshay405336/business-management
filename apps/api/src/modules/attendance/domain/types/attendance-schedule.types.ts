export type AttendanceDaySchedule = {
  readonly day: number;
  readonly startMinutes: number;
  readonly endMinutes: number;
};

export type AttendanceScheduleConfig = {
  readonly scheduleId: string;
  readonly timeZone: string;
  readonly officeStartMinutes: number;
  readonly officeEndMinutes: number;
  readonly lateGraceMinutes: number;
  readonly attendanceCutoffMinutes: number;
  readonly minFullDayMinutes: number;
  readonly minHalfDayMinutes: number;
  readonly weeklyOffDays: readonly number[];
  readonly workingDays: readonly number[];
  readonly daySchedules: readonly AttendanceDaySchedule[];
  readonly earlyPunchInAllowanceMinutes: number;
  readonly requireRegisteredDevice: boolean;
  readonly allowPunchOutAfterOfficeEnd: boolean;
  readonly ipAllowlist?: readonly string[];
};

export type AttendanceDayKind = 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY';
