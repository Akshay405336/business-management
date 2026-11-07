'use client';

import { upsertAttendanceSettingsRequestSchema } from '@techwin/validation';
import {
  CalendarClock,
  Clock,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { fetchAttendanceSettings, saveAttendanceSettings } from '@/features/attendance/api/attendance';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import {
  QUOTATION_FORM_FOOTER_CLASS,
  QUOTATION_FORM_PRIMARY_BTN,
  QUOTATION_FORM_SCROLL_CLASS,
  QUOTATION_FORM_SECONDARY_BTN,
} from '@/features/crm/quotations/components/quotation-dialog-shell';
import { minutesToLabel } from '@/features/attendance/utils/time';
import { AttendanceTimePicker } from './attendance-time-picker';
import { AttendanceTimezoneSelect } from './attendance-timezone-select';
import {
  defaultFormState,
  formStateFromSettings,
  formStateToPayload,
  serializeFormState,
  joinDurationMinutes,
  parseNonNegativeInt,
  time12ToMinutes,
  type AttendanceSettingsFormState,
  type DayScheduleRow,
} from '../utils/attendance-settings-time';

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/70 p-3">
      <div className="mb-3 flex gap-2">
        <div className="bg-muted/60 text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 grid gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-xs leading-snug">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function AttendanceSettingsPanel() {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AttendanceSettingsFormState>(() => defaultFormState());
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeFormState(defaultFormState()));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dirty = useMemo(
    () => serializeFormState(form) !== savedSnapshot,
    [form, savedSnapshot],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAttendanceSettings();
      const next = res.current ? formStateFromSettings(res.current) : defaultFormState();
      setForm(next);
      setSavedSnapshot(serializeFormState(next));
      setFieldErrors({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load attendance settings.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const applyOfficeHoursToWorkingDays = () => {
    setForm((prev) => ({
      ...prev,
      dayRows: prev.dayRows.map((row) =>
        row.isWorking
          ? { ...row, start: { ...prev.officeStart }, end: { ...prev.officeEnd } }
          : row,
      ),
    }));
  };

  const updateDayRow = (day: number, patch: Partial<DayScheduleRow>) => {
    setForm((prev) => ({
      ...prev,
      dayRows: prev.dayRows.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    }));
  };

  const onCancel = () => {
    if (!dirty) return;
    setForm(JSON.parse(savedSnapshot) as AttendanceSettingsFormState);
    setFieldErrors({});
  };

  const onSave = async () => {
    const payload = formStateToPayload(form);
    const parsed = upsertAttendanceSettingsRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = zodIssuesToFieldMap(parsed.error);
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'daySchedules' && typeof issue.path[1] === 'number') {
          const day = payload.daySchedules[issue.path[1]]?.day;
          if (day != null && issue.message) errors[`day.${day}.end`] = issue.message;
        }
        if (issue.path[0] === 'earlyPunchInAllowanceMinutes' && issue.message) {
          errors.earlyPunchInAllowanceMinutes = issue.message;
        }
      }
      setFieldErrors(errors);
      toast.error(parsed.error.issues[0]?.message ?? 'Fix validation errors before saving.');
      return;
    }
    const officeStart = time12ToMinutes(form.officeStart);
    const officeEnd = time12ToMinutes(form.officeEnd);
    if (officeEnd <= officeStart) {
      setFieldErrors({ officeEndMinutes: 'Office end must be after office start.' });
      return;
    }
    for (const row of form.dayRows) {
      if (!row.isWorking) continue;
      if (time12ToMinutes(row.end) <= time12ToMinutes(row.start)) {
        setFieldErrors({ [`day.${row.day}.end`]: `${row.label}: end must be after start.` });
        toast.error(`Check working hours for ${row.label}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const saved = await saveAttendanceSettings(parsed.data);
      const next = saved.current ? formStateFromSettings(saved.current) : defaultFormState();
      setForm(next);
      setSavedSnapshot(serializeFormState(next));
      setFieldErrors({});
      toast.success('Attendance settings saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={QUOTATION_FORM_SCROLL_CLASS}>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-label="Loading settings" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={QUOTATION_FORM_SCROLL_CLASS}>
      <div className="grid min-w-0 gap-3">
        <SettingsSection
          icon={CalendarClock}
          title="Effective date & time zone"
          description="New rules apply from the effective date. Past attendance keeps the schedule snapshot stored on each record."
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="effectiveFrom" required>
                Effective from
              </CrmFieldLabel>
              <Input
                id="effectiveFrom"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
              />
              <CrmInlineFieldError message={fieldErrors.effectiveFrom} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="timeZone" required>
                Time zone
              </CrmFieldLabel>
              <AttendanceTimezoneSelect
                id="timeZone"
                value={form.timeZone}
                onChange={(timeZone) => setForm((f) => ({ ...f, timeZone }))}
              />
              <CrmInlineFieldError message={fieldErrors.timeZone} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Clock}
          title="Office schedule"
          description="Default office hours used as the template for working days. Adjust per-day times in the section below."
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel required>Office start time</CrmFieldLabel>
              <AttendanceTimePicker
                value={form.officeStart}
                onChange={(officeStart) => setForm((f) => ({ ...f, officeStart }))}
                aria-invalid={Boolean(fieldErrors.officeStartMinutes)}
              />
              <CrmInlineFieldError message={fieldErrors.officeStartMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel required>Office end time</CrmFieldLabel>
              <AttendanceTimePicker
                value={form.officeEnd}
                onChange={(officeEnd) => setForm((f) => ({ ...f, officeEnd }))}
                aria-invalid={Boolean(fieldErrors.officeEndMinutes)}
              />
              <CrmInlineFieldError message={fieldErrors.officeEndMinutes} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={CalendarDays}
          title="Working days & weekly off"
          description="Enable any day as a working day—including weekends. Disabled days are treated as weekly off for attendance."
        >
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(QUOTATION_FORM_SECONDARY_BTN, 'h-9 px-3 text-xs')}
              onClick={applyOfficeHoursToWorkingDays}
            >
              Apply office hours to all working days
            </Button>
          </div>
          <div className="min-w-0 overflow-x-hidden rounded-lg border border-border/70">
            {form.dayRows.map((row) => (
              <div key={row.day} className="border-b px-3 py-2 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">{row.label}</span>
                  <Checkbox
                    checked={row.isWorking}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      updateDayRow(row.day, {
                        isWorking: checked === true,
                        ...(checked === true
                          ? {
                              start: { ...form.officeStart },
                              end: { ...form.officeEnd },
                            }
                          : {}),
                      })
                    }
                    aria-label={`${row.label} working day`}
                    className="border-2 border-neutral-950 data-[state=checked]:border-neutral-950"
                  />
                </div>
                {row.isWorking ? (
                  <div className="mt-2 flex flex-nowrap items-center gap-3">
                    <AttendanceTimePicker
                      value={row.start}
                      onChange={(start) => updateDayRow(row.day, { start })}
                      className="flex-nowrap"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <AttendanceTimePicker
                      value={row.end}
                      onChange={(end) => updateDayRow(row.day, { end })}
                      className="flex-nowrap"
                    />
                    <CrmInlineFieldError
                      message={fieldErrors[`day.${row.day}.end`]}
                      reserveSpace={false}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs font-medium">Weekly off</p>
                )}
              </div>
            ))}
          </div>
          <CrmInlineFieldError message={fieldErrors.workingDays} />
        </SettingsSection>

        <SettingsSection
          icon={ShieldCheck}
          title="Attendance rules"
          description="Late grace, minimum hours, and punch behavior. Absence is marked after office end."
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel>Late grace period (minutes)</CrmFieldLabel>
              <Input
                type="number"
                min={0}
                max={240}
                value={form.lateGraceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lateGraceMinutes: parseNonNegativeInt(e.target.value, 240) }))
                }
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
              />
              <p className="text-muted-foreground text-xs">
                Earliest punch-in{' '}
                {minutesToLabel(
                  time12ToMinutes(form.officeStart) -
                    joinDurationMinutes(form.earlyPunchInHours, form.earlyPunchInMinutes),
                )}
                . On time through{' '}
                {minutesToLabel(time12ToMinutes(form.officeStart) + form.lateGraceMinutes)}. Enter 30
                for a 30-minute grace. This value is minutes and is separate from the half-day minimum.
              </p>
              <CrmInlineFieldError message={fieldErrors.lateGraceMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Full-day minimum</CrmFieldLabel>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={form.fullDayHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullDayHours: parseNonNegativeInt(e.target.value, 24) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                  aria-label="Full day hours"
                />
                <span className="text-muted-foreground self-center text-sm">h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={form.fullDayMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullDayMinutes: parseNonNegativeInt(e.target.value, 59) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                  aria-label="Full day minutes"
                />
                <span className="text-muted-foreground self-center text-sm">m</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Saved as {joinDurationMinutes(form.fullDayHours, form.fullDayMinutes)} minutes.
              </p>
              <CrmInlineFieldError message={fieldErrors.minFullDayMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Half-day minimum</CrmFieldLabel>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={form.halfDayHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, halfDayHours: parseNonNegativeInt(e.target.value, 24) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={form.halfDayMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, halfDayMinutes: parseNonNegativeInt(e.target.value, 59) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">m</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Saved as {joinDurationMinutes(form.halfDayHours, form.halfDayMinutes)} minutes. Completed
                work below this duration is Half Day.
              </p>
              <CrmInlineFieldError message={fieldErrors.minHalfDayMinutes} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <CrmFieldLabel>Early punch-in allowance</CrmFieldLabel>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={form.earlyPunchInHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, earlyPunchInHours: parseNonNegativeInt(e.target.value, 8) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={form.earlyPunchInMinutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, earlyPunchInMinutes: parseNonNegativeInt(e.target.value, 59) }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">m before office start</span>
              </div>
              <CrmInlineFieldError message={fieldErrors.earlyPunchInAllowanceMinutes} />
            </div>
            <label className="flex items-center gap-3 sm:col-span-2">
              <Checkbox
                checked={form.allowPunchOutAfterOfficeEnd}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setForm((f) => ({ ...f, allowPunchOutAfterOfficeEnd: checked === true }))
                }
              />
              <span className="text-sm">Allow punch-out after configured office end time</span>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={MonitorSmartphone}
          title="Device & security"
          description="Employees may view attendance history on mobile. Punch in and punch out require an approved desktop browser session."
        >
          <label className="flex items-start gap-3">
            <Checkbox
              checked={form.requireRegisteredDevice}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setForm((f) => ({ ...f, requireRegisteredDevice: checked === true }))
              }
              className="mt-0.5"
            />
            <span className="grid gap-1 text-sm">
              <span className="font-medium">Require registered trusted device for punching</span>
              <span className="text-muted-foreground text-xs leading-snug">
                When enabled, each employee registers a desktop device before their first punch. Mobile
                browsers are always blocked for punch actions at the server.
              </span>
            </span>
          </label>
          <p className="text-muted-foreground mt-2 text-xs">
            Status:{' '}
            <span className="text-foreground font-medium">
              {form.requireRegisteredDevice ? 'Trusted device required' : 'Desktop browser only (default)'}
            </span>
          </p>
        </SettingsSection>
      </div>
      </div>
      <DialogFooter className={QUOTATION_FORM_FOOTER_CLASS}>
        <Button
          type="button"
          variant="outline"
          className={QUOTATION_FORM_SECONDARY_BTN}
          disabled={!dirty || saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className={cn('h-11 px-5', QUOTATION_FORM_PRIMARY_BTN)}
          disabled={!dirty || saving}
          onClick={() => void onSave()}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            'Save settings'
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
