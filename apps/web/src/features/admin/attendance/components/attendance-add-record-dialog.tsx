'use client';

import type { AttendanceScheduleSettings } from '@techwin/contracts';
import { createAttendanceRecordRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { createAttendanceRecord, fetchAttendanceSettings } from '@/features/attendance/api/attendance';
import { AttendanceStatusBadge } from '@/features/attendance/components/attendance-status-badge';
import { previewPunchAttendance } from '@/features/attendance/utils/attendance-preview';
import { attendanceResultDetail } from '@/features/attendance/utils/attendance-result';
import { cn } from '@/shared/lib/utils';
import { AttendanceEmployeeSelect } from './attendance-employee-select';
import { AttendanceTimePicker } from './attendance-time-picker';
import { instantFromDateAndTime12 } from '../utils/attendance-correction-time';
import { localTodayKey } from '../utils/calendar-month';
import {
  minutesToTime12,
  scheduleEffectiveOn,
  time12ToMinutes,
  type Time12Parts,
} from '../utils/attendance-settings-time';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'max-w-[720px] sm:w-[min(720px,calc(100vw-2rem))]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

type FormState = {
  employeeId: string;
  attendanceDate: string;
  hasPunchIn: boolean;
  punchIn: Time12Parts;
  hasPunchOut: boolean;
  punchOut: Time12Parts;
  reason: string;
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function weekdayFor(date: string, timeZone: string): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hourCycle: 'h23',
  }).format(new Date(`${date}T12:00:00.000Z`));
  return WEEKDAYS[label] ?? 1;
}

function emptyForm(): FormState {
  return {
    employeeId: '',
    attendanceDate: localTodayKey(),
    hasPunchIn: true,
    punchIn: minutesToTime12(9 * 60),
    hasPunchOut: false,
    punchOut: minutesToTime12(18 * 60),
    reason: '',
  };
}

export function AttendanceAddRecordDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  defaultDate?: string;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [timeZone, setTimeZone] = useState('UTC');
  const [history, setHistory] = useState<readonly AttendanceScheduleSettings[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm(),
      attendanceDate: defaultDate || localTodayKey(),
    });
    setFieldErrors({});
    void fetchAttendanceSettings().then((loaded) => {
      setHistory(loaded.history);
      const current = loaded.current;
      const tz = current?.timeZone ?? 'UTC';
      setTimeZone(tz);
      const start = current?.officeStartMinutes ?? 9 * 60 + 30;
      const end = current?.officeEndMinutes ?? 18 * 60 + 30;
      setForm((formState) => ({
        ...formState,
        punchIn: minutesToTime12(start),
        punchOut: minutesToTime12(end),
      }));
    });
  }, [open, defaultDate]);

  const applicableSettings = scheduleEffectiveOn(history, form.attendanceDate);
  const previewForForm = () => {
    if (!applicableSettings) {
      return previewPunchAttendance({
        officeStartMinutes: 0,
        officeEndMinutes: 1,
        lateGraceMinutes: 0,
        earlyPunchInAllowanceMinutes: 0,
        minHalfDayMinutes: 1,
        punchInMinutes: null,
        punchOutMinutes: null,
      });
    }
    const weekday = weekdayFor(form.attendanceDate, applicableSettings.timeZone);
    const day = applicableSettings.daySchedules?.find((entry) => entry.day === weekday);
    return previewPunchAttendance({
      officeStartMinutes: day?.startMinutes ?? applicableSettings.officeStartMinutes,
      officeEndMinutes: day?.endMinutes ?? applicableSettings.officeEndMinutes,
      lateGraceMinutes: applicableSettings.lateGraceMinutes,
      earlyPunchInAllowanceMinutes: applicableSettings.earlyPunchInAllowanceMinutes,
      minHalfDayMinutes: applicableSettings.minHalfDayMinutes,
      punchInMinutes: form.hasPunchIn ? time12ToMinutes(form.punchIn) : null,
      punchOutMinutes: form.hasPunchOut ? time12ToMinutes(form.punchOut) : null,
    });
  };

  const onSubmit = async () => {
    const zone = applicableSettings?.timeZone ?? timeZone;
    const payload = {
      employeeId: form.employeeId,
      attendanceDate: form.attendanceDate,
      reason: form.reason.trim(),
      punchInAt: form.hasPunchIn
        ? instantFromDateAndTime12(form.attendanceDate, form.punchIn, zone)
        : null,
      punchOutAt: form.hasPunchOut
        ? instantFromDateAndTime12(form.attendanceDate, form.punchOut, zone)
        : null,
    };
    const parsed = createAttendanceRecordRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    if (!form.employeeId) {
      setFieldErrors({ employeeId: 'Select an employee.' });
      focusFirstInvalidField();
      return;
    }
    setFieldErrors({});
    try {
      await run(() => createAttendanceRecord(parsed.data));
      toast.success('Attendance record created.');
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (isApiError(failure) && failure.details.length > 0) {
        setFieldErrors((current) => ({ ...current, ...apiDetailsToFieldMap(failure.details) }));
        focusFirstInvalidField();
      }
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Add Attendance Record
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 pb-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="add-employee" required>
                Employee
              </CrmFieldLabel>
              <AttendanceEmployeeSelect
                id="add-employee"
                value={form.employeeId}
                invalid={Boolean(fieldErrors.employeeId)}
                disabled={pending}
                onChange={(employeeId) => {
                  setForm((c) => ({ ...c, employeeId }));
                  clearFormFieldError(setFieldErrors, 'employeeId');
                }}
              />
              <CrmInlineFieldError message={fieldErrors.employeeId} reserveSpace={false} />
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
              <CrmFieldLabel htmlFor="add-date" required>
                Attendance date
              </CrmFieldLabel>
              <Input
                id="add-date"
                type="date"
                max={localTodayKey()}
                value={form.attendanceDate}
                disabled={pending}
                className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, formControlStateClass('neutral'))}
                onChange={(e) => setForm((c) => ({ ...c, attendanceDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 rounded-lg border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <CrmFieldLabel>Punch in</CrmFieldLabel>
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={!form.hasPunchIn}
                      onCheckedChange={(checked) =>
                        setForm((c) => ({ ...c, hasPunchIn: checked !== true }))
                      }
                    />
                    No punch in
                  </label>
                </div>
                <AttendanceTimePicker
                  value={form.punchIn}
                  disabled={pending || !form.hasPunchIn}
                  onChange={(punchIn) => setForm((c) => ({ ...c, punchIn }))}
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <CrmFieldLabel>Punch out</CrmFieldLabel>
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={!form.hasPunchOut}
                      onCheckedChange={(checked) =>
                        setForm((c) => ({ ...c, hasPunchOut: checked !== true }))
                      }
                    />
                    No punch out
                  </label>
                </div>
                <AttendanceTimePicker
                  value={form.punchOut}
                  disabled={pending || !form.hasPunchOut}
                  onChange={(punchOut) => setForm((c) => ({ ...c, punchOut }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">Calculated result</span>
              {previewForForm().rejection ? (
                <span className="text-destructive text-xs">{previewForForm().rejection}</span>
              ) : (
                <>
                  <AttendanceStatusBadge status={previewForForm().status} />
                  {attendanceResultDetail({
                    ...previewForForm(),
                    punchInAt: form.hasPunchIn ? 'preview' : null,
                    punchOutAt: form.hasPunchOut ? 'preview' : null,
                  }) ? (
                    <span className="text-muted-foreground text-xs">
                      {attendanceResultDetail({
                        ...previewForForm(),
                        punchInAt: form.hasPunchIn ? 'preview' : null,
                        punchOutAt: form.hasPunchOut ? 'preview' : null,
                      })}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Status, late arrival, early departure and working hours are calculated from these punch
              times and the attendance settings effective on this date
              {applicableSettings ? ` (${applicableSettings.timeZone})` : ''}. Approved leave can replace
              Absent on save. A punch before the earliest allowed time is rejected.
            </p>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="add-reason" required>
                Reason for correction
              </CrmFieldLabel>
              <Textarea
                id="add-reason"
                placeholder="Explain why this attendance record is being created."
                value={form.reason}
                disabled={pending}
                className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, formControlStateClass(fieldErrors.reason ? 'invalid' : 'neutral'))}
                onChange={(e) => {
                  setForm((c) => ({ ...c, reason: e.target.value }));
                  clearFormFieldError(setFieldErrors, 'reason');
                }}
              />
              <CrmInlineFieldError message={fieldErrors.reason} reserveSpace={false} />
            </div>
          </div>
        </div>
        <DialogFooter className="border-border shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" className={SECONDARY_BTN} disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className={PRIMARY_BTN} disabled={pending} onClick={() => void onSubmit()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
