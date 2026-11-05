import { applyLeaveRequestSchema, type ApplyLeaveRequest } from '@techwin/validation';
import type { ZodError } from 'zod';
import { normalizeSelectedDateKeys } from './leave-calendar-date';

const LEAVE_APPLY_FIELD_LABELS: Record<string, string> = {
  leaveTypeId: 'Leave type',
  selectedDates: 'Leave dates',
  startDate: 'Start date',
  endDate: 'End date',
  reason: 'Reason',
  notes: 'Notes',
  halfDaySession: 'Half-day session',
  halfDayDate: 'Half-day date',
  attachmentStoredObjectId: 'Supporting document',
};

export function mapLeaveApplyZodErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (out[key]) continue;
    const label = LEAVE_APPLY_FIELD_LABELS[key];
    out[key] = label ? `${label}: ${issue.message}` : issue.message;
  }
  return out;
}

export function mapLeaveApplyApiDetails(
  details: readonly { path: string; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const detail of details) {
    const key = detail.path.split('.')[0] || 'form';
    if (out[key]) continue;
    const label = LEAVE_APPLY_FIELD_LABELS[key];
    const message =
      detail.message === 'Invalid input'
        ? 'This field is required.'
        : detail.message.replace(/^Invalid input: expected string, received undefined$/i, 'This field is required.');
    out[key] = label ? `${label}: ${message}` : message;
  }
  return out;
}

export function buildApplyLeavePayload(input: {
  leaveTypeId: string;
  selectedLeaveDates: readonly string[];
  isHalfDay: boolean;
  halfDayDate: string;
  halfDaySession: 'FIRST_HALF' | 'SECOND_HALF' | '';
  reason: string;
  notes: string;
  attachmentStoredObjectId?: string | null;
}): ApplyLeaveRequest {
  const selectedDates = normalizeSelectedDateKeys(input.selectedLeaveDates);
  const startDate = selectedDates[0]!;
  const endDate = selectedDates[selectedDates.length - 1]!;

  const halfDay =
    input.isHalfDay && (input.halfDayDate || (selectedDates.length === 1 ? selectedDates[0]! : ''));

  return applyLeaveRequestSchema.parse({
    leaveTypeId: input.leaveTypeId,
    selectedDates,
    startDate,
    endDate,
    isHalfDay: input.isHalfDay,
    reason: input.reason.trim(),
    notes: input.notes.trim(),
    attachmentStoredObjectId: input.attachmentStoredObjectId ?? null,
    ...(input.isHalfDay
      ? {
          halfDaySession: input.halfDaySession || null,
          ...(halfDay ? { halfDayDate: halfDay } : {}),
        }
      : {}),
  });
}
