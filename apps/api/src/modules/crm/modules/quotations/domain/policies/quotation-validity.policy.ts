import { QuotationValidationError } from '../errors/quotation.errors.js';
import { addUtcCalendarDays, toUtcDateOnlyString } from '../utils/quotation-date.utils.js';

export const DEFAULT_QUOTATION_VALIDITY_DAYS = 7;

export class QuotationValidityPolicy {
  static assertDateRange(issueDate: Date, expiryDate: Date | null | undefined): void {
    if (!expiryDate) return;
    if (toUtcDateOnlyString(expiryDate) < toUtcDateOnlyString(issueDate)) {
      throw new QuotationValidationError('Valid-until date cannot be earlier than the issue date.');
    }
  }

  static resolveCreateDates(input: {
    readonly issueDate: Date;
    readonly expiryDate?: Date | null;
  }): { readonly issueDate: Date; readonly expiryDate: Date } {
    this.assertDateRange(input.issueDate, input.expiryDate ?? null);
    const expiryDate =
      input.expiryDate ??
      utcDateFromIso(addUtcCalendarDays(toUtcDateOnlyString(input.issueDate), DEFAULT_QUOTATION_VALIDITY_DAYS));
    return { issueDate: input.issueDate, expiryDate };
  }

  static validatePatch(input: {
    readonly issueDate?: Date;
    readonly expiryDate?: Date | null;
    readonly existingIssueDate: Date;
    readonly existingExpiryDate: Date | null;
  }): void {
    const issueDate = input.issueDate ?? input.existingIssueDate;
    const expiryDate =
      input.expiryDate === undefined ? input.existingExpiryDate : input.expiryDate;
    this.assertDateRange(issueDate, expiryDate);
  }
}

function utcDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
