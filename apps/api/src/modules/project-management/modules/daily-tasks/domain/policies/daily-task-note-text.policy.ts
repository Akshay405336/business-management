import { DailyTaskValidationError } from '../errors/daily-task.errors.js';

const MAX_NOTE_LENGTH = 2000;

export function assertDailyTaskNoteText(trimmed: string): void {
  if (trimmed.length === 0) {
    throw new DailyTaskValidationError('Note text is required.');
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new DailyTaskValidationError('Note is too long (max 2000 characters).');
  }
}

export function normalizeDailyTaskNoteText(raw: string): string {
  return raw.trim();
}
