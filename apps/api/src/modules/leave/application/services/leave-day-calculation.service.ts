import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_CALENDAR_REPOSITORY,
  type OrgCalendarRepository,
} from '../../../organization-calendar/index.js';
import { LeaveValidationError } from '../../domain/errors/leave.errors.js';
import {
  normalizeLeaveDateKeys,
  type ResolvedLeaveRequestDates,
} from '../../domain/policies/leave-request-dates.policy.js';

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatLeaveDays(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

function dateKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const d = parseDateOnly(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyFromDate(d);
}

function parseMinNoticeWorkingDays(minApplicationDays: string | undefined): number {
  const parsed = Number.parseFloat(minApplicationDays ?? '0.5');
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.ceil(parsed);
}

export type LeavePolicyDateWindow = {
  readonly yearStartDate: string;
  readonly yearEndDate: string;
};

@Injectable()
export class LeaveDayCalculationService {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY)
    private readonly orgCalendar: OrgCalendarRepository,
  ) {}

  async resolveApplicationDateKey(organizationId: string): Promise<string> {
    return this.orgCalendar.resolveOrganizationTodayKey(organizationId);
  }

  async isWorkingDay(
    organizationId: string,
    dateKey: string,
    employeeId?: string,
  ): Promise<boolean> {
    const kind = await this.orgCalendar.classifyDateForOrganization(
      organizationId,
      dateKey,
      employeeId,
    );
    return kind === 'WORKING';
  }

  private async nextWorkingDayOnOrAfter(
    organizationId: string,
    employeeId: string,
    dateKey: string,
  ): Promise<string> {
    let cursor = dateKey;
    for (let guard = 0; guard < 400; guard += 1) {
      if (await this.isWorkingDay(organizationId, cursor, employeeId)) {
        return cursor;
      }
      cursor = addDaysToDateKey(cursor, 1);
    }
    throw new LeaveValidationError('Unable to determine the earliest eligible leave start date.');
  }

  private async countWorkingDaysStrictlyBetween(
    organizationId: string,
    employeeId: string,
    afterDateKey: string,
    beforeDateKey: string,
  ): Promise<number> {
    if (beforeDateKey <= afterDateKey) return 0;
    let total = 0;
    let cursor = addDaysToDateKey(afterDateKey, 1);
    while (cursor < beforeDateKey) {
      if (await this.isWorkingDay(organizationId, cursor, employeeId)) {
        total += 1;
      }
      cursor = addDaysToDateKey(cursor, 1);
    }
    return total;
  }

  async computeEarliestEligibleStartDate(
    organizationId: string,
    employeeId: string,
    applicationDateKey: string,
    minApplicationDays?: string,
    policyWindow?: LeavePolicyDateWindow | null,
  ): Promise<string> {
    const requiredWorkingDays = parseMinNoticeWorkingDays(minApplicationDays);
    let earliest: string;

    if (requiredWorkingDays === 0) {
      earliest = await this.nextWorkingDayOnOrAfter(
        organizationId,
        employeeId,
        applicationDateKey,
      );
    } else {
      let candidate = addDaysToDateKey(applicationDateKey, 1);
      let found: string | null = null;
      for (let guard = 0; guard < 400; guard += 1) {
        const noticeWorkingDays = await this.countWorkingDaysStrictlyBetween(
          organizationId,
          employeeId,
          applicationDateKey,
          candidate,
        );
        if (
          noticeWorkingDays >= requiredWorkingDays &&
          (await this.isWorkingDay(organizationId, candidate, employeeId))
        ) {
          found = candidate;
          break;
        }
        candidate = addDaysToDateKey(candidate, 1);
      }
      if (!found) {
        throw new LeaveValidationError('Unable to determine the earliest eligible leave start date.');
      }
      earliest = found;
    }

    if (policyWindow && earliest < policyWindow.yearStartDate) {
      earliest = await this.nextWorkingDayOnOrAfter(
        organizationId,
        employeeId,
        policyWindow.yearStartDate,
      );
    }

    if (policyWindow && earliest > policyWindow.yearEndDate) {
      throw new LeaveValidationError('No eligible leave dates remain in the active leave policy period.');
    }

    return earliest;
  }

  assertDatesWithinPolicy(
    startDate: string,
    endDate: string,
    policyWindow: LeavePolicyDateWindow | null,
  ): void {
    if (!policyWindow) {
      throw new LeaveValidationError('No active leave policy applies to the selected dates.');
    }
    if (startDate < policyWindow.yearStartDate || endDate > policyWindow.yearEndDate) {
      throw new LeaveValidationError('Leave dates must fall within the active leave policy period.');
    }
  }

  assertSelectedDatesWithinPolicy(
    selectedDates: readonly string[],
    policyWindow: LeavePolicyDateWindow | null,
  ): void {
    if (selectedDates.length === 0) {
      throw new LeaveValidationError('Select at least one leave date.');
    }
    const startDate = selectedDates[0]!;
    const endDate = selectedDates[selectedDates.length - 1]!;
    this.assertDatesWithinPolicy(startDate, endDate, policyWindow);
    for (const dateKey of selectedDates) {
      if (
        policyWindow &&
        (dateKey < policyWindow.yearStartDate || dateKey > policyWindow.yearEndDate)
      ) {
        throw new LeaveValidationError(
          `Leave date ${dateKey} is outside the active leave policy period.`,
        );
      }
    }
  }

  async countLeaveDaysForSelectedDates(
    organizationId: string,
    employeeId: string,
    selectedDates: readonly string[],
    isHalfDay: boolean,
    halfDayDate: string | null,
  ): Promise<string> {
    const dates = normalizeLeaveDateKeys(selectedDates);
    if (dates.length === 0) {
      throw new LeaveValidationError('Select at least one leave date.');
    }

    let resolvedHalfDayDate = halfDayDate;
    if (isHalfDay && !resolvedHalfDayDate && dates.length === 1) {
      resolvedHalfDayDate = dates[0]!;
    }
    if (isHalfDay && dates.length > 1 && !resolvedHalfDayDate) {
      throw new LeaveValidationError(
        'Select which date is the half-day when multiple dates are selected.',
      );
    }
    if (isHalfDay && resolvedHalfDayDate && !dates.includes(resolvedHalfDayDate)) {
      throw new LeaveValidationError('Half-day date must be one of the selected leave dates.');
    }

    let total = 0;
    for (const dateKey of dates) {
      if (!(await this.isWorkingDay(organizationId, dateKey, employeeId))) {
        throw new LeaveValidationError(
          `Date ${dateKey} is not a working leave day according to the organization calendar.`,
        );
      }
      if (isHalfDay && dateKey === resolvedHalfDayDate) {
        total += 0.5;
      } else {
        total += 1;
      }
    }

    if (total <= 0) {
      throw new LeaveValidationError(
        'The selected period has no working leave days according to the organization calendar.',
      );
    }

    return formatLeaveDays(total);
  }

  async tryCountLeaveDaysForSelectedDates(
    organizationId: string,
    employeeId: string,
    selectedDates: readonly string[],
    isHalfDay: boolean,
    halfDayDate: string | null,
  ): Promise<{ totalDays: string; hasWorkingLeaveDays: boolean }> {
    try {
      const totalDays = await this.countLeaveDaysForSelectedDates(
        organizationId,
        employeeId,
        selectedDates,
        isHalfDay,
        halfDayDate,
      );
      return { totalDays, hasWorkingLeaveDays: true };
    } catch (error) {
      if (error instanceof LeaveValidationError) {
        return { totalDays: '0', hasWorkingLeaveDays: false };
      }
      throw error;
    }
  }

  async countLeaveDays(
    organizationId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
  ): Promise<string> {
    if (isHalfDay && startDate !== endDate) {
      throw new LeaveValidationError('Half-day leave must use the same start and end date.');
    }

    let total = 0;
    let cursor = startDate;
    while (cursor <= endDate) {
      if (await this.isWorkingDay(organizationId, cursor, employeeId)) {
        total += isHalfDay && startDate === endDate ? 0.5 : 1;
      }
      cursor = addDaysToDateKey(cursor, 1);
    }

    if (total <= 0) {
      throw new LeaveValidationError(
        'The selected period has no working leave days according to the organization calendar.',
      );
    }

    return formatLeaveDays(total);
  }

  async tryCountLeaveDays(
    organizationId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
  ): Promise<{ totalDays: string; hasWorkingLeaveDays: boolean }> {
    try {
      const totalDays = await this.countLeaveDays(
        organizationId,
        employeeId,
        startDate,
        endDate,
        isHalfDay,
      );
      return { totalDays, hasWorkingLeaveDays: true };
    } catch (error) {
      if (
        error instanceof LeaveValidationError &&
        error.message.includes('no working leave days')
      ) {
        return { totalDays: '0', hasWorkingLeaveDays: false };
      }
      throw error;
    }
  }

  async assertAdvanceNoticeForSelectedDates(
    organizationId: string,
    employeeId: string,
    selectedDates: readonly string[],
    minApplicationDays?: string,
    policyWindow?: LeavePolicyDateWindow | null,
  ): Promise<void> {
    this.assertSelectedDatesWithinPolicy(selectedDates, policyWindow ?? null);
    const applicationDate = await this.resolveApplicationDateKey(organizationId);
    const earliest = await this.computeEarliestEligibleStartDate(
      organizationId,
      employeeId,
      applicationDate,
      minApplicationDays,
      policyWindow,
    );
    for (const dateKey of selectedDates) {
      if (dateKey < earliest) {
        throw new LeaveValidationError(
          `Leave does not meet the minimum notice requirement. The earliest eligible start date is ${earliest}.`,
        );
      }
    }
  }

  async preview(
    organizationId: string,
    employeeId: string,
    startDate: string | undefined,
    endDate: string | undefined,
    selectedDates: readonly string[] | undefined,
    isHalfDay: boolean,
    halfDayDate: string | null | undefined,
    minApplicationDays?: string,
    policyWindow?: LeavePolicyDateWindow | null,
    skipDuration?: boolean,
  ): Promise<{
    totalDays: string;
    earliestEligibleStartDate: string;
    policyYearStartDate: string | null;
    policyYearEndDate: string | null;
    hasWorkingLeaveDays: boolean;
  }> {
    const applicationDate = await this.resolveApplicationDateKey(organizationId);
    const earliestEligibleStartDate = await this.computeEarliestEligibleStartDate(
      organizationId,
      employeeId,
      applicationDate,
      minApplicationDays,
      policyWindow,
    );

    if (skipDuration) {
      return {
        totalDays: '0',
        earliestEligibleStartDate,
        policyYearStartDate: policyWindow?.yearStartDate ?? null,
        policyYearEndDate: policyWindow?.yearEndDate ?? null,
        hasWorkingLeaveDays: false,
      };
    }

    const explicitSelected = selectedDates?.length ? normalizeLeaveDateKeys(selectedDates) : null;
    const duration = explicitSelected
      ? await this.tryCountLeaveDaysForSelectedDates(
          organizationId,
          employeeId,
          explicitSelected,
          isHalfDay,
          halfDayDate ?? null,
        )
      : await this.tryCountLeaveDays(
          organizationId,
          employeeId,
          startDate!,
          endDate!,
          isHalfDay,
        );

    return {
      totalDays: duration.totalDays,
      earliestEligibleStartDate,
      policyYearStartDate: policyWindow?.yearStartDate ?? null,
      policyYearEndDate: policyWindow?.yearEndDate ?? null,
      hasWorkingLeaveDays: duration.hasWorkingLeaveDays,
    };
  }

  async assertLeaveRequestDates(
    organizationId: string,
    employeeId: string,
    resolved: ResolvedLeaveRequestDates,
    minApplicationDays?: string,
    policyWindow?: LeavePolicyDateWindow | null,
  ): Promise<void> {
    await this.assertAdvanceNoticeForSelectedDates(
      organizationId,
      employeeId,
      resolved.selectedDates,
      minApplicationDays,
      policyWindow,
    );
  }
}
