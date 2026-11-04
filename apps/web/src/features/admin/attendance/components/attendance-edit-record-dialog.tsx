'use client';

import type { AttendanceRecordDetail, AttendanceStatus } from '@techwin/contracts';
import { correctAttendanceRecordRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/features/attendance/api/attendance';
import { formatDurationMinutes, formatLateDuration } from '@/features/attendance/utils/time';
import { cn } from '@/shared/lib/utils';
import { ATTENDANCE_STATUS_OPTIONS } from '../constants/attendance-status-options';
import { AttendanceTimePicker } from './attendance-time-picker';
import {
  instantFromDateAndTime12,
  isoToTime12,
} from '../utils/attendance-correction-time';
import {
  minutesToTime12,
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

const SCHEDULE_INDEPENDENT: readonly AttendanceStatus[] = [
  'HOLIDAY',
  'WEEKLY_OFF',
  'ON_LEAVE',
  'PENDING',
];

type FormState = {
  status: AttendanceStatus;
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
    status: detail.status,
    hasPunchIn: punchIn != null,
    punchIn: punchIn ?? defaultStart,
    hasPunchOut: punchOut != null,
    punchOut: punchOut ?? minutesToTime12(detail.scheduleSnapshot.officeEndMinutes),
    reason: '',
  };
}

function buildPayload(form: FormState, detail: AttendanceRecordDetail) {
  const tz = detail.scheduleSnapshot.timeZone;
  const date = detail.attendanceDate;
  return {
    reason: form.reason.trim(),
    status: form.status,
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !recordId) {
      setDetail(null);
      setForm(null);
      setFieldErrors({});
      return;
    }
    setLoading(true);
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

  const punchesOptional = useMemo(
    () => form != null && (SCHEDULE_INDEPENDENT.includes(form.status) || form.status === 'ABSENT'),
    [form],
  );

  const onSubmit = async () => {
    if (!detail || !form || !recordId) return;
    const payload = buildPayload(form, detail);
    const parsed = correctAttendanceRecordRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    if (!form.hasPunchIn && ['PRESENT', 'LATE', 'HALF_DAY'].includes(form.status)) {
      setFieldErrors({ punchInAt: 'Punch in is required for the selected status.' });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
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

              <section className="grid gap-3">
                <h3 className="text-foreground text-sm font-semibold">Attendance status</h3>
                <div className="grid gap-1.5 sm:max-w-xs">
                  <CrmFieldLabel htmlFor="attendance-status" required>
                    Status
                  </CrmFieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(value) => {
                      setForm((current) =>
                        current ? { ...current, status: value as AttendanceStatus } : current,
                      );
                      clearFormFieldError(setFieldErrors, 'status');
                    }}
                    disabled={pending}
                  >
                    <SelectTrigger
                      id="attendance-status"
                      aria-invalid={Boolean(fieldErrors.status)}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(fieldErrors.status ? 'invalid' : 'neutral'),
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CrmInlineFieldError message={fieldErrors.status} reserveSpace={false} />
                </div>
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
                {punchesOptional ? (
                  <p className="text-muted-foreground text-xs leading-snug">
                    Punch times are optional for {form.status.replace('_', ' ').toLowerCase()} records.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs leading-snug">
                    Provide punch in for present, late, or half-day records. Punch out may be left empty for
                    incomplete attendance.
                  </p>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Working hours (current)</CrmFieldLabel>
                  <Input
                    readOnly
                    value={formatDurationMinutes(detail.workingMinutes)}
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40 tabular-nums')}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Recalculated on save from punch times and office rules.
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Late by (current)</CrmFieldLabel>
                  <Input
                    readOnly
                    value={formatLateDuration(detail.lateMinutes)}
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40')}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Based on office schedule and grace period at save time.
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
