import { AttendancePolicyError } from '../errors/attendance.errors.js';
import type { UpsertAttendanceSettingsInput } from '../types/attendance-inputs.js';

/** Validates persisted attendance settings. Hours are stored once, in minutes. */
export function assertAttendanceSettings(input: UpsertAttendanceSettingsInput): void {
  if (input.officeEndMinutes <= input.officeStartMinutes) {
    throw new AttendancePolicyError('Office end must be after office start.');
  }
  if (input.minHalfDayMinutes < 1 || input.minFullDayMinutes < 1) {
    throw new AttendancePolicyError('Working-hour minimums must be at least one minute.');
  }
  if (input.minHalfDayMinutes > input.minFullDayMinutes) {
    throw new AttendancePolicyError('Half-day minimum must not exceed full-day minimum.');
  }
  if (input.lateGraceMinutes < 0) {
    throw new AttendancePolicyError('Late grace period cannot be negative.');
  }
  if (input.earlyPunchInAllowanceMinutes < 0) {
    throw new AttendancePolicyError('Early punch-in allowance cannot be negative.');
  }
  if (input.workingDays.length === 0) {
    throw new AttendancePolicyError('Select at least one working day.');
  }
}
