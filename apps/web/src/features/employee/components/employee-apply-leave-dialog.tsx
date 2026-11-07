'use client';

import type { useEmployeeLeavePage } from '../hooks/use-employee-leave-page';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import {
  formatLeaveBalanceSummary,
  formatLeaveTypeOptionLabel,
  hasLeaveBalanceAvailable,
} from '../constants/employee-leave-ui';
import { cn } from '@/shared/lib/utils';
import {
  formatDateKeyShort,
  formatSelectedDatesFormSummary,
} from '../constants/leave-calendar-date';
import {
  LeaveDatesFieldTrigger,
  LeaveMultiDatePickerDialog,
} from './leave-multi-date-picker-dialog';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-4 text-sm font-medium text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

type LeavePage = ReturnType<typeof useEmployeeLeavePage>;

export function EmployeeApplyLeaveDialog({
  open,
  onOpenChange,
  page,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: LeavePage;
}) {
  const hasBalances = page.balances.length > 0;
  const emptyBalancesMessage =
    page.balancesError ??
    page.balancesAvailability?.message ??
    `No leave balances are configured for ${page.calendarYear}. Contact HR if you expect entitlements.`;
  const [datesPickerOpen, setDatesPickerOpen] = useState(false);
  const formEnabled = hasBalances && page.leaveTypeId.length > 0 && !page.applyPending;

  const canSubmit =
    formEnabled &&
    page.selectedBalance !== null &&
    hasLeaveBalanceAvailable(page.selectedBalance) &&
    page.selectedLeaveDates.length > 0 &&
    !page.balanceShortageMessage &&
    page.previewHasWorkingDays;

  useEffect(() => {
    if (!open) return;
    void page.reloadBalances();
  }, [open, page.reloadBalances]);

  const handleSubmit = async () => {
    const ok = await page.applyLeave();
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !page.applyPending) {
          page.resetApplyForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Apply for Leave
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Submit a new leave request for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-3.5 pb-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="apply-leave-type">Leave type</CrmFieldLabel>
              <Select
                value={page.leaveTypeId || undefined}
                onValueChange={page.setLeaveTypeId}
                disabled={!hasBalances || page.balancesLoading || page.applyPending}
              >
                <SelectTrigger
                  id="apply-leave-type"
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'h-auto min-h-11 py-2')}
                >
                  {page.selectedBalance ? (
                    <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                      <span className="text-foreground text-sm font-medium">
                        {page.selectedBalance.leaveTypeName}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">
                        {formatLeaveBalanceSummary(page.selectedBalance)}
                      </span>
                    </span>
                  ) : (
                    <SelectValue
                      placeholder={
                        page.balancesLoading
                          ? 'Loading leave balances…'
                          : hasBalances
                            ? 'Select leave type'
                            : page.balancesAvailability?.message ?? 'No leave entitlements available'
                      }
                    />
                  )}
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-2rem,520px)]">
                  {page.balances.length === 0 ? (
                    <div className="text-muted-foreground px-3 py-4 text-center text-sm">
                      {emptyBalancesMessage}
                    </div>
                  ) : (
                    page.balances.map((balance) => {
                      const selectable = hasLeaveBalanceAvailable(balance);
                      return (
                        <SelectItem
                          key={balance.id}
                          value={balance.leaveTypeId}
                          disabled={!selectable}
                          className="items-start py-2.5"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-foreground text-sm font-medium">
                              {balance.leaveTypeName}
                            </span>
                            <span className="text-muted-foreground text-xs leading-snug">
                              {selectable
                                ? formatLeaveTypeOptionLabel(balance)
                                : `${formatLeaveTypeOptionLabel(balance)} · No balance available`}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={page.applyFieldErrors.leaveTypeId} reserveSpace={false} />
            </div>

            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="apply-leave-dates">Leave dates</CrmFieldLabel>
              <LeaveDatesFieldTrigger
                id="apply-leave-dates"
                value={page.selectedLeaveDates}
                disabled={!formEnabled}
                onClick={() => setDatesPickerOpen(true)}
              />
              <LeaveMultiDatePickerDialog
                open={datesPickerOpen}
                onOpenChange={setDatesPickerOpen}
                appliedDates={page.selectedLeaveDates}
                onApply={(dates) => page.setSelectedLeaveDates([...dates])}
                earliestEligibleStartDate={page.previewEarliestStartDate}
                policyYearStartDate={page.policyYearStartDate}
                policyYearEndDate={page.policyYearEndDate}
                isHalfDay={page.isHalfDay}
                disabled={!formEnabled}
              />
              <CrmInlineFieldError message={page.applyFieldErrors.selectedDates} reserveSpace={false} />
            </div>

            {page.selectedLeaveDates.length > 0 ? (
              <div className="rounded-lg border border-[#E8E8EF] bg-[#F8F9FC] px-3 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-semibold uppercase tracking-wide">
                      Selected leave dates
                    </p>
                    <p className="text-foreground mt-1 leading-snug">
                      {formatSelectedDatesFormSummary(page.selectedLeaveDates)}
                    </p>
                    {page.previewDays !== null && page.previewHasWorkingDays ? (
                      <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                        {page.previewDays} working day{page.previewDays === '1' ? '' : 's'} selected
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 shrink-0 px-2 text-xs font-medium"
                    disabled={!formEnabled}
                    onClick={() => setDatesPickerOpen(true)}
                  >
                    Edit dates
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="apply-half"
                      checked={page.isHalfDay}
                      disabled={!formEnabled || page.selectedLeaveDates.length === 0}
                      onCheckedChange={(v) => page.setIsHalfDay(v === true)}
                    />
                    <label htmlFor="apply-half" className="text-sm font-normal">
                      Half day
                    </label>
                  </div>
                  {page.isHalfDay ? (
                    <Select
                      value={page.halfDaySession || undefined}
                      disabled={!formEnabled}
                      onValueChange={(v) =>
                        page.setHalfDaySession(v as 'FIRST_HALF' | 'SECOND_HALF')
                      }
                    >
                      <SelectTrigger className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'h-11 w-[11rem]')}>
                        <SelectValue placeholder="Session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIRST_HALF">First half</SelectItem>
                        <SelectItem value="SECOND_HALF">Second half</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                {page.isHalfDay && page.selectedLeaveDates.length > 1 ? (
                  <div className="grid gap-1.5 sm:max-w-xs">
                    <CrmFieldLabel htmlFor="apply-half-day-date">Half-day date</CrmFieldLabel>
                    <Select
                      value={page.halfDayDate || undefined}
                      disabled={!formEnabled}
                      onValueChange={page.setHalfDayDate}
                    >
                      <SelectTrigger id="apply-half-day-date" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                        <SelectValue placeholder="Select date for half-day" />
                      </SelectTrigger>
                      <SelectContent>
                        {page.selectedLeaveDates.map((dateKey) => (
                          <SelectItem key={dateKey} value={dateKey}>
                            {formatDateKeyShort(dateKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <CrmInlineFieldError message={page.applyFieldErrors.halfDayDate} reserveSpace={false} />
                  </div>
                ) : null}
              </div>

            <div className="rounded-lg border border-[#E8E8EF] bg-[#F8F9FC] px-3 py-2.5 text-sm">
              {page.previewLoading ? (
                <span className="text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Calculating working days…
                </span>
              ) : page.previewDays !== null && page.previewHasWorkingDays ? (
                <p className="text-foreground">
                  Leave duration:{' '}
                  <strong className="tabular-nums">{page.previewDays}</strong> working day
                  {page.previewDays === '1' ? '' : 's'}
                </p>
              ) : page.previewDays !== null && !page.previewHasWorkingDays ? (
                <p className="text-red-700">
                  The selected period has no working leave days according to the organization
                  calendar.
                </p>
              ) : (
                <p className="text-muted-foreground">Select dates to calculate working days.</p>
              )}
              {page.previewEarliestStartDate ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Earliest eligible start date:{' '}
                  <span className="text-foreground font-medium">{page.previewEarliestStartDate}</span>
                </p>
              ) : null}
              {page.balanceShortageMessage || page.applyFieldErrors.balance ? (
                <p className="mt-1.5 text-xs text-red-700">
                  {page.balanceShortageMessage ?? page.applyFieldErrors.balance}
                </p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="apply-reason" required>
                Reason
              </CrmFieldLabel>
              <Textarea
                id="apply-reason"
                className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem]')}
                placeholder="Explain why you need this leave..."
                value={page.reason}
                disabled={!formEnabled}
                onChange={(e) => page.setReason(e.target.value)}
              />
              <CrmInlineFieldError message={page.applyFieldErrors.reason} reserveSpace={false} />
            </div>

            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="apply-notes" optional>
                Notes
              </CrmFieldLabel>
              <Textarea
                id="apply-notes"
                className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[3.5rem]')}
                placeholder="Add any additional information..."
                value={page.notes}
                disabled={!formEnabled}
                onChange={(e) => page.setNotes(e.target.value)}
              />
            </div>

          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={SECONDARY_BTN}
            disabled={page.applyPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={PRIMARY_BTN}
            disabled={page.applyPending || !canSubmit}
            onClick={() => void handleSubmit()}
          >
            {page.applyPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
