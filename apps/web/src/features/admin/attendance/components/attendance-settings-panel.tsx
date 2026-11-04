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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { fetchAttendanceSettings, saveAttendanceSettings } from '@/features/attendance/api/attendance';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import { AttendanceTimePicker } from './attendance-time-picker';
import { AttendanceTimezoneSelect } from './attendance-timezone-select';
import {
  defaultFormState,
  formStateFromSettings,
  formStateToPayload,
  serializeFormState,
  time12ToMinutes,
  type AttendanceSettingsFormState,
  type DayScheduleRow,
} from '../utils/attendance-settings-time';

const PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-5 text-sm font-medium text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const SECONDARY_BTN =
  'h-11 rounded-lg border border-input bg-card px-4 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

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
    <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="mb-5 flex gap-3">
        <div className="bg-muted/60 text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 grid gap-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm leading-snug">{description}</p>
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
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      toast.error('Fix validation errors before saving.');
      return;
    }
    const officeStart = time12ToMinutes(form.officeStart);
    const officeEnd = time12ToMinutes(form.officeEnd);
    if (officeEnd <= officeStart) {
      setFieldErrors({ officeEndMinutes: 'Office end must be after office start.' });
      return;
    }
    if (time12ToMinutes(form.attendanceCutoff) < officeStart) {
      setFieldErrors({
        attendanceCutoffMinutes: 'Cutoff must be on or after office start.',
      });
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
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading settings" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 pb-24">
        <SettingsSection
          icon={CalendarClock}
          title="Effective date & time zone"
          description="New rules apply from the effective date. Past attendance keeps the schedule snapshot stored on each record."
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" className={SECONDARY_BTN} onClick={applyOfficeHoursToWorkingDays}>
              Apply office hours to all working days
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-medium uppercase tracking-wide">
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Working day</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                </tr>
              </thead>
              <tbody>
                {form.dayRows.map((row) => (
                  <tr key={row.day} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">
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
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.isWorking ? (
                        <AttendanceTimePicker
                          value={row.start}
                          onChange={(start) => updateDayRow(row.day, { start })}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">Weekly off</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isWorking ? (
                        <>
                          <AttendanceTimePicker
                            value={row.end}
                            onChange={(end) => updateDayRow(row.day, { end })}
                          />
                          <CrmInlineFieldError
                            message={fieldErrors[`day.${row.day}.end`]}
                            reserveSpace={false}
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">Weekly off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CrmInlineFieldError message={fieldErrors.workingDays} />
        </SettingsSection>

        <SettingsSection
          icon={ShieldCheck}
          title="Attendance rules"
          description="Late grace, cutoff, minimum hours, and punch behavior."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel>Late grace period (minutes)</CrmFieldLabel>
              <Input
                type="number"
                min={0}
                max={240}
                value={form.lateGraceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lateGraceMinutes: Number(e.target.value) || 0 }))
                }
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
              />
              <p className="text-muted-foreground text-xs">Minutes after office start still counted as on time.</p>
              <CrmInlineFieldError message={fieldErrors.lateGraceMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel required>Attendance cutoff</CrmFieldLabel>
              <AttendanceTimePicker
                value={form.attendanceCutoff}
                onChange={(attendanceCutoff) => setForm((f) => ({ ...f, attendanceCutoff }))}
              />
              <p className="text-muted-foreground text-xs">Latest time employees may punch in without being absent.</p>
              <CrmInlineFieldError message={fieldErrors.attendanceCutoffMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Full-day minimum</CrmFieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={form.fullDayHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullDayHours: Number(e.target.value) || 0 }))
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
                    setForm((f) => ({ ...f, fullDayMinutes: Number(e.target.value) || 0 }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                  aria-label="Full day minutes"
                />
                <span className="text-muted-foreground self-center text-sm">m</span>
              </div>
              <CrmInlineFieldError message={fieldErrors.minFullDayMinutes} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Half-day minimum</CrmFieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={form.halfDayHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, halfDayHours: Number(e.target.value) || 0 }))
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
                    setForm((f) => ({ ...f, halfDayMinutes: Number(e.target.value) || 0 }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">m</span>
              </div>
              <CrmInlineFieldError message={fieldErrors.minHalfDayMinutes} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <CrmFieldLabel>Early punch-in allowance</CrmFieldLabel>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={form.earlyPunchInHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, earlyPunchInHours: Number(e.target.value) || 0 }))
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
                    setForm((f) => ({ ...f, earlyPunchInMinutes: Number(e.target.value) || 0 }))
                  }
                  className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'w-24')}
                />
                <span className="text-muted-foreground self-center text-sm">m before office start</span>
              </div>
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
          <p className="text-muted-foreground mt-4 text-xs">
            Status:{' '}
            <span className="text-foreground font-medium">
              {form.requireRegisteredDevice ? 'Trusted device required' : 'Desktop browser only (default)'}
            </span>
          </p>
        </SettingsSection>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 -mx-1 border-t border-border/80 px-1 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className={SECONDARY_BTN} disabled={!dirty || saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className={PRIMARY_BTN} disabled={!dirty || saving} onClick={() => void onSave()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save settings'
            )}
          </Button>
        </div>
      </div>

    </>
  );
}
