'use client';

import type { AttendanceRecordDetail, AttendanceScheduleSettings } from '@techwin/contracts';
import { correctAttendanceRecordRequestSchema } from '@techwin/validation';
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
import {
  correctAttendanceRecord,
  fetchAttendanceRecordDetail,
  fetchAttendanceSettings,
} from '@/features/attendance/api/attendance';
import { AttendanceStatusBadge } from '@/features/attendance/components/attendance-status-badge';
import { previewPunchAttendance } from '@/features/attendance/utils/attendance-preview';
import { attendanceResultDetail, describeRecordResult } from '@/features/attendance/utils/attendance-result';
import { formatAttendanceWorkingHours } from '@/features/attendance/utils/time';
import { cn } from '@/shared/lib/utils';
import { AttendanceTimePicker } from './attendance-time-picker';
import {
  instantFromDateAndTime12,
  isoToTime12,
} from '../utils/attendance-correction-time';
import {
  minutesToTime12,
  scheduleEffectiveOn,
  time12ToMinutes,
  type Time12Parts,
} from '../utils/attendance-settings-time';

export const ATTENDANCE_RECORD_DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'max-w-[720px] sm:w-[min(720px,calc(100vw-2rem))]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

type FormState = {
  hasPunchIn: boolean;
  punchIn: Time12Parts;
  hasPunchOut: boolean;
  punchOut: Time12Parts;
  reason: string;
};

function detailToForm(detail: AttendanceRecordDetail): FormState {
  const tz = detail.scheduleSnapshot.timeZone;
  const punchIn = isoToTime12(detail.punchInAt, tz);
  const punchOut = isoToTime12(detail.punchOutAt, tz);
  const defaultStart = minutesToTime12(detail.scheduleSnapshot.officeStartMinutes);
  return {
    hasPunchIn: punchIn != null,
    punchIn: punchIn ?? defaultStart,
    hasPunchOut: punchOut != null,
    punchOut: punchOut ?? minutesToTime12(detail.scheduleSnapshot.officeEndMinutes),
    reason: '',
  };
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function editPreview(
  detail: AttendanceRecordDetail,
  form: FormState,
  schedule: AttendanceScheduleSettings | null,
) {
  const source = schedule ?? detail.scheduleSnapshot;
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: source.timeZone,
    weekday: 'short',
    hourCycle: 'h23',
  }).format(new Date(`${detail.attendanceDate}T12:00:00.000Z`));
  const weekday = WEEKDAYS[label] ?? 1;
  const day = source.daySchedules?.find((entry) => entry.day === weekday);
  return previewPunchAttendance({
    officeStartMinutes: day?.startMinutes ?? source.officeStartMinutes,
    officeEndMinutes: day?.endMinutes ?? source.officeEndMinutes,
    lateGraceMinutes: source.lateGraceMinutes,
    earlyPunchInAllowanceMinutes: source.earlyPunchInAllowanceMinutes,
    minHalfDayMinutes: source.minHalfDayMinutes,
    punchInMinutes: form.hasPunchIn ? time12ToMinutes(form.punchIn) : null,
    punchOutMinutes: form.hasPunchOut ? time12ToMinutes(form.punchOut) : null,
  });
}

function buildPayload(form: FormState, detail: AttendanceRecordDetail) {
  const tz = detail.scheduleSnapshot.timeZone;
  const date = detail.attendanceDate;
  return {
    reason: form.reason.trim(),
    punchInAt: form.hasPunchIn
      ? instantFromDateAndTime12(date, form.punchIn, tz)
      : null,
    punchOutAt: form.hasPunchOut
      ? instantFromDateAndTime12(date, form.punchOut, tz)
      : null,
  };
}

export function AttendanceEditRecordDialog({
  open,
  recordId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  recordId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [detail, setDetail] = useState<AttendanceRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [schedules, setSchedules] = useState<readonly AttendanceScheduleSettings[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !recordId) {
      setDetail(null);
      setForm(null);
      setFieldErrors({});
      return;
    }
    setLoading(true);
    void fetchAttendanceSettings()
      .then((loaded) => setSchedules(loaded.history))
      .catch(() => setSchedules([]));
    void fetchAttendanceRecordDetail(recordId)
      .then((loaded) => {
        setDetail(loaded);
        setForm(detailToForm(loaded));
        setFieldErrors({});
      })
      .catch((failure) => {
        toast.error(describeCrmError(failure));
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, recordId, onOpenChange, toast]);

  const onSubmit = async () => {
    if (!detail || !form || !recordId) return;
    const payload = buildPayload(form, detail);
    const parsed = correctAttendanceRecordRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    setFieldErrors({});
    try {
      await run(() => correctAttendanceRecord(recordId, parsed.data));
      toast.success('Attendance record updated.');
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

  const preview =
    detail && form
      ? editPreview(detail, form, scheduleEffectiveOn(schedules, detail.attendanceDate))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={ATTENDANCE_RECORD_DIALOG_SHELL}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Edit Attendance Record
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loading || !detail || !form ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading attendance record…
            </div>
          ) : (
            <div className="grid gap-6 pb-2">
              <section className="grid gap-3">
                <h3 className="text-foreground text-sm font-semibold">Employee information</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <CrmFieldLabel>Employee name</CrmFieldLabel>
                    <Input
                      readOnly
                      value={detail.employeeDisplayName}
                      className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40')}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <CrmFieldLabel>Employee code</CrmFieldLabel>
                    <Input
                      readOnly
                      value={detail.employeeCode}
                      className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40 font-mono text-sm')}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <CrmFieldLabel>Attendance date</CrmFieldLabel>
                    <Input
                      readOnly
                      value={detail.attendanceDate}
                      className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40 tabular-nums')}
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-2">
                <h3 className="text-foreground text-sm font-semibold">Calculated result</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {preview?.rejection ? (
                    <span className="text-destructive text-xs">{preview.rejection}</span>
                  ) : preview ? (
                    <>
                      <AttendanceStatusBadge status={preview.status} />
                      {attendanceResultDetail({
                        ...preview,
                        punchInAt: form.hasPunchIn ? 'preview' : null,
                        punchOutAt: form.hasPunchOut ? 'preview' : null,
                      }) ? (
                        <span className="text-muted-foreground text-xs">
                          {attendanceResultDetail({
                            ...preview,
                            punchInAt: form.hasPunchIn ? 'preview' : null,
                            punchOutAt: form.hasPunchOut ? 'preview' : null,
                          })}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs leading-snug">
                  Saving recalculates status from these punch times and the attendance settings effective
                  on this date. A punch before the earliest allowed time is rejected. Approved leave can
                  replace Absent when there is no punch-in.
                </p>
              </section>

              <section className="grid gap-3">
                <h3 className="text-foreground text-sm font-semibold">Punch times</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 rounded-lg border border-border/70 bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CrmFieldLabel>Punch in</CrmFieldLabel>
                      <label className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={!form.hasPunchIn}
                          disabled={pending}
                          onCheckedChange={(checked) => {
                            setForm((current) =>
                              current ? { ...current, hasPunchIn: checked !== true } : current,
                            );
                            clearFormFieldError(setFieldErrors, 'punchInAt');
                          }}
                        />
                        No punch in
                      </label>
                    </div>
                    <AttendanceTimePicker
                      value={form.punchIn}
                      disabled={pending || !form.hasPunchIn}
                      aria-invalid={Boolean(fieldErrors.punchInAt)}
                      onChange={(punchIn) => setForm((current) => (current ? { ...current, punchIn } : current))}
                    />
                    <CrmInlineFieldError message={fieldErrors.punchInAt} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2 rounded-lg border border-border/70 bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CrmFieldLabel>Punch out</CrmFieldLabel>
                      <label className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={!form.hasPunchOut}
                          disabled={pending}
                          onCheckedChange={(checked) => {
                            setForm((current) =>
                              current ? { ...current, hasPunchOut: checked !== true } : current,
                            );
                            clearFormFieldError(setFieldErrors, 'punchOutAt');
                          }}
                        />
                        No punch out
                      </label>
                    </div>
                    <AttendanceTimePicker
                      value={form.punchOut}
                      disabled={pending || !form.hasPunchOut}
                      aria-invalid={Boolean(fieldErrors.punchOutAt)}
                      onChange={(punchOut) => setForm((current) => (current ? { ...current, punchOut } : current))}
                    />
                    <CrmInlineFieldError message={fieldErrors.punchOutAt} reserveSpace={false} />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-snug">
                  Leave punch-out empty while the employee is still in progress. A missing punch-in is
                  Absent only after office end, unless approved leave covers the date.
                </p>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Working hours (current)</CrmFieldLabel>
                  <Input
                    readOnly
                    value={formatAttendanceWorkingHours(
                      detail.workingMinutes,
                      detail.punchInAt,
                      detail.punchOutAt,
                    )}
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40 tabular-nums')}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Recalculated on save from punch times and office rules.
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Result (saved)</CrmFieldLabel>
                  <Input
                    readOnly
                    value={describeRecordResult(detail) || detail.status.replace('_', ' ')}
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40')}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Saved result. Editing punch times recalculates it from the current settings.
                  </p>
                </div>
              </section>

              <section className="grid gap-2">
                <CrmFieldLabel htmlFor="correction-reason" required>
                  Reason for correction
                </CrmFieldLabel>
                <Textarea
                  id="correction-reason"
                  placeholder="Explain why this attendance record is being changed."
                  value={form.reason}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.reason)}
                  className={cn(
                    CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                    formControlStateClass(fieldErrors.reason ? 'invalid' : 'neutral'),
                  )}
                  onChange={(event) => {
                    setForm((current) =>
                      current ? { ...current, reason: event.target.value } : current,
                    );
                    clearFormFieldError(setFieldErrors, 'reason');
                  }}
                />
                <CrmInlineFieldError message={fieldErrors.reason} reserveSpace={false} />
              </section>
            </div>
          )}
        </div>

        <DialogFooter className="border-border shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className={PRIMARY_BTN} disabled={pending || loading} onClick={() => void onSubmit()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
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
