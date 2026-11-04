'use client';

import type { OrgCalendarEventItem, OrgCalendarMonthDay } from '@techwin/contracts';
import { createOrgCalendarEventRequestSchema } from '@techwin/validation';
import { isApiError } from '@/shared/api/api-error';
import { apiDetailsToFieldMap, zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { AttendanceTimePicker } from '@/features/admin/attendance/components/attendance-time-picker';
import {
  minutesToTime12,
  time12ToMinutes,
  WEEKDAY_UI_ROWS,
  type Time12Parts,
} from '@/features/admin/attendance/utils/attendance-settings-time';
import { fetchAttendanceSettings, listAttendanceRecords } from '@/features/attendance/api/attendance';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { cn } from '@/shared/lib/utils';
import { createOrgCalendarEvent, deleteOrgCalendarEvent } from '../api/org-calendar-api';
import {
  defaultTitleForMarkAs,
  markAsFromDayEvents,
  ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES,
  ORG_CALENDAR_MARK_AS_DROPDOWN_OPTIONS,
  ORG_CALENDAR_MARK_AS_OPTIONS,
  isOrgCalendarMarkAsDropdownValue,
  type OrgCalendarMarkAs,
} from '../constants/org-calendar-mark-as';
import { resolveOrgCalendarCardStyle } from '../constants/org-calendar-theme';
import { labelForEventType, ORG_CALENDAR_DAY_KIND_LABEL } from '../constants/org-calendar-event-types';
import { localTodayKey } from '@/features/admin/attendance/utils/calendar-month';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'max-w-[720px] sm:w-[min(720px,calc(100vw-2rem))]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const HOLIDAY_TITLE_PLACEHOLDER = 'e.g. Ganesh Chaturthi, Diwali, Independence Day';

function formatWeekdayLong(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMinutesLabel(minutes: number): string {
  const t = minutesToTime12(minutes);
  const mm = String(t.minute).padStart(2, '0');
  return `${t.hour12}:${mm} ${t.period}`;
}

function readOnlyScheduleFallback(
  dateKey: string | null,
  day: OrgCalendarMonthDay | undefined,
): string {
  if (!dateKey) return 'Office schedule not available.';
  const kind = day?.dayKind;
  if (kind === 'WEEKLY_OFF') return 'Weekly off per organisation office schedule.';
  if (kind === 'HOLIDAY' || kind === 'NON_WORKING') {
    return 'Non-working day per organisation calendar.';
  }
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  const label = WEEKDAY_UI_ROWS.find((r) => r.day === weekday)?.label ?? 'This day';
  return `${label} follows the organisation office schedule.`;
}

function isHolidayMarkAs(markAs: OrgCalendarMarkAs): boolean {
  return markAs === 'PUBLIC_HOLIDAY' || markAs === 'COMPANY_HOLIDAY';
}

export function OrgCalendarDateManageDialog({
  open,
  onOpenChange,
  dateKey,
  day,
  canManage,
  onSaved,
  onEditEvent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  day: OrgCalendarMonthDay | undefined;
  canManage: boolean;
  onSaved: () => void | Promise<void>;
  onEditEvent: (event: OrgCalendarEventItem) => void;
}) {
  const toast = useAdminToast();
  const [pending, setPending] = useState(false);
  const [markAs, setMarkAs] = useState<OrgCalendarMarkAs>('WORKING');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [annual, setAnnual] = useState(false);
  const [startTime, setStartTime] = useState<Time12Parts>(() => minutesToTime12(9 * 60 + 30));
  const [endTime, setEndTime] = useState<Time12Parts>(() => minutesToTime12(18 * 60 + 30));
  const [scheduleLine, setScheduleLine] = useState<string | null>(null);
  const [minHalfDayMinutes, setMinHalfDayMinutes] = useState<number | null>(null);
  const [officeStartMinutes, setOfficeStartMinutes] = useState(9 * 60 + 30);
  const [officeEndMinutes, setOfficeEndMinutes] = useState(18 * 60 + 30);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [impactConfirmOpen, setImpactConfirmOpen] = useState(false);
  const [impactRecordCount, setImpactRecordCount] = useState(0);
  const initialMarkAsRef = useRef<OrgCalendarMarkAs>('WORKING');

  const cardStyle = dateKey
    ? resolveOrgCalendarCardStyle(dateKey, day?.dayKind, true, localTodayKey())
    : null;

  const classificationEvents = useMemo(
    () =>
      (day?.events ?? []).filter((e) =>
        ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(e.eventType),
      ),
    [day?.events],
  );

  const otherEvents = useMemo(
    () =>
      (day?.events ?? []).filter(
        (e) => !ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(e.eventType),
      ),
    [day?.events],
  );

  const halfDayDurationMinutes = Math.max(0, time12ToMinutes(endTime) - time12ToMinutes(startTime));

  useEffect(() => {
    if (!open || !dateKey || !day) return;
    const initialMark = markAsFromDayEvents(day.dayKind, day.events);
    initialMarkAsRef.current = initialMark;
    setMarkAs(initialMark);
    const primary = classificationEvents[0];
    setTitle(primary?.title ?? '');
    setDescription(primary?.description ?? '');
    setAnnual(primary?.recurrence === 'ANNUAL');
    setStartTime(minutesToTime12(primary?.startTimeMinutes ?? 9 * 60 + 30));
    setEndTime(minutesToTime12(primary?.endTimeMinutes ?? 13 * 60));
    setFieldErrors({});
  }, [open, dateKey, day, classificationEvents]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setScheduleLine(null);
    void fetchAttendanceSettings()
      .then((res) => {
        if (cancelled) return;
        if (!dateKey || !res.current) {
          setScheduleLine(readOnlyScheduleFallback(dateKey, day));
          setMinHalfDayMinutes(null);
          return;
        }
        setMinHalfDayMinutes(res.current.minHalfDayMinutes);
        const weekday = new Date(`${dateKey}T12:00:00`).getDay();
        const label = WEEKDAY_UI_ROWS.find((r) => r.day === weekday)?.label ?? 'Day';
        const row = res.current.daySchedules.find((d) => d.day === weekday);
        const off =
          res.current.weeklyOffDays.includes(weekday) ||
          !res.current.workingDays.includes(weekday);
        const start = row?.startMinutes ?? res.current.officeStartMinutes;
        const end = row?.endMinutes ?? res.current.officeEndMinutes;
        setOfficeStartMinutes(start);
        setOfficeEndMinutes(end);
        if (off) {
          setScheduleLine(`${label}: weekly off in office schedule (effective ${res.current.effectiveFrom}).`);
          return;
        }
        setScheduleLine(
          `${label}: ${formatMinutesLabel(start)} – ${formatMinutesLabel(end)} (effective ${res.current.effectiveFrom}).`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setScheduleLine(readOnlyScheduleFallback(dateKey, day));
        setMinHalfDayMinutes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, dateKey, day]);

  useEffect(() => {
    if (!open || classificationEvents.length > 0) return;
    if (markAs === 'SPECIAL_WORKING_DAY') {
      setStartTime(minutesToTime12(officeStartMinutes));
      setEndTime(minutesToTime12(officeEndMinutes));
    } else if (markAs === 'HALF_WORKING_DAY') {
      setStartTime(minutesToTime12(officeStartMinutes));
      const halfEnd = officeStartMinutes + (minHalfDayMinutes ?? 240);
      setEndTime(minutesToTime12(Math.min(halfEnd, officeEndMinutes)));
    }
  }, [open, markAs, officeStartMinutes, officeEndMinutes, minHalfDayMinutes, classificationEvents.length]);

  async function removeClassificationEvents() {
    const ids = [...new Set(classificationEvents.map((e) => e.id))];
    for (const id of ids) {
      await deleteOrgCalendarEvent(id);
    }
  }

  function buildPayload() {
    if (!dateKey) return null;
    const option = ORG_CALENDAR_MARK_AS_OPTIONS.find((o) => o.value === markAs);
    const eventType = option?.eventType;
    if (!eventType) return null;

    const isHalf = markAs === 'HALF_WORKING_DAY';
    const isSpecial = markAs === 'SPECIAL_WORKING_DAY';
    const usesTimes = isHalf || isSpecial;

    return {
      title: title.trim() || defaultTitleForMarkAs(markAs),
      description: description.trim(),
      eventType,
      startDate: dateKey,
      endDate: dateKey,
      isFullDay: !usesTimes,
      startTimeMinutes: usesTimes ? time12ToMinutes(startTime) : null,
      endTimeMinutes: usesTimes ? time12ToMinutes(endTime) : null,
      appliesToAllEmployees: true,
      employeeIds: [] as string[],
      recurrence: isHolidayMarkAs(markAs) && annual ? ('ANNUAL' as const) : ('NONE' as const),
      isActive: true,
      color: '#64748b',
    };
  }

  async function commitSave() {
    if (!dateKey || !canManage) return;
    setFieldErrors({});

    if (markAs !== 'WORKING') {
      if (isHolidayMarkAs(markAs) && !title.trim()) {
        setFieldErrors({ title: 'Enter a holiday title.' });
        return;
      }
      const payload = buildPayload();
      if (!payload) return;
      if (payload.isFullDay === false) {
        if (payload.startTimeMinutes == null || payload.endTimeMinutes == null) {
          setFieldErrors({ startTimeMinutes: 'Enter start and end times.' });
          return;
        }
        if (payload.endTimeMinutes <= payload.startTimeMinutes) {
          setFieldErrors({ endTimeMinutes: 'End time must be after start time.' });
          return;
        }
      }
      const parsed = createOrgCalendarEventRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldMap(parsed.error));
        return;
      }
    }

    setPending(true);
    try {
      await removeClassificationEvents();
      if (markAs !== 'WORKING') {
        const payload = buildPayload();
        if (!payload) throw new Error('Invalid classification.');
        const parsed = createOrgCalendarEventRequestSchema.parse(payload);
        await createOrgCalendarEvent(parsed);
      }
      toast.success('Calendar updated for this date.');
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(describeCrmError(err));
      if (isApiError(err) && err.details.length > 0) {
        setFieldErrors((current) => ({ ...current, ...apiDetailsToFieldMap(err.details) }));
      }
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    if (!dateKey || !canManage) return;
    setFieldErrors({});

    if (markAs !== 'WORKING') {
      if (isHolidayMarkAs(markAs) && !title.trim()) {
        setFieldErrors({ title: 'Enter a holiday title.' });
        return;
      }
      const payload = buildPayload();
      if (!payload) return;
      if (payload.isFullDay === false) {
        if (payload.startTimeMinutes == null || payload.endTimeMinutes == null) {
          setFieldErrors({ startTimeMinutes: 'Enter start and end times.' });
          return;
        }
        if (payload.endTimeMinutes <= payload.startTimeMinutes) {
          setFieldErrors({ endTimeMinutes: 'End time must be after start time.' });
          return;
        }
      }
      const parsed = createOrgCalendarEventRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldMap(parsed.error));
        return;
      }
    }

    const classificationChanging = markAs !== initialMarkAsRef.current;
    if (classificationChanging) {
      try {
        const response = await listAttendanceRecords({ date: dateKey, page: 1, pageSize: 1 });
        if (response.total > 0) {
          setImpactRecordCount(response.total);
          setImpactConfirmOpen(true);
          return;
        }
      } catch {
        toast.error('Could not check existing attendance for this date.');
        return;
      }
    }

    await commitSave();
  }

  if (!dateKey) return null;

  const showHolidayFields = isHolidayMarkAs(markAs);
  const showWeeklyOffFields = markAs === 'WEEKLY_OFF';
  const showSpecialWorkingFields = markAs === 'SPECIAL_WORKING_DAY';
  const showHalfDayFields = markAs === 'HALF_WORKING_DAY';
  const showWorkingHint = markAs === 'WORKING';

  return (
    <>
    <AlertDialog open={impactConfirmOpen} onOpenChange={setImpactConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update calendar and attendance?</AlertDialogTitle>
          <AlertDialogDescription>
            This date has {impactRecordCount} attendance record{impactRecordCount === 1 ? '' : 's'}.
            Changing how the organisation calendar classifies this date will recalculate derived
            attendance statuses where allowed. Punch timestamps, audit history, and manually corrected
            records are preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setImpactConfirmOpen(false);
              void commitSave();
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {canManage ? 'Manage date' : 'Date details'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{formatWeekdayLong(dateKey)}</p>
          {cardStyle ? (
            <span
              className={cn(
                'inline-flex w-fit rounded-lg border px-2.5 py-1 text-xs font-semibold',
                cardStyle.bg,
                cardStyle.border,
                cardStyle.text,
              )}
            >
              {ORG_CALENDAR_DAY_KIND_LABEL[day?.dayKind ?? 'WORKING'] ?? cardStyle.statusLabel}
            </span>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 pb-2">
            <div className="rounded-lg border border-border/70 bg-[#f7faff] px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Office schedule
              </p>
              <p className="mt-1 text-foreground">{scheduleLine ?? 'Loading office schedule…'}</p>
            </div>

            {classificationEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Saved exception
                </p>
                {classificationEvents.map((ev) => (
                  <div
                    key={`${ev.id}-${ev.startDate}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelForEventType(ev.eventType)}
                        {ev.recurrence === 'ANNUAL' ? ' · Repeats annually' : ''}
                        {' · '}
                        {ev.appliesToAllEmployees ? 'All employees' : `${ev.employeeIds.length} employees`}
                      </p>
                    </div>
                    {canManage ? (
                      <Button type="button" size="sm" variant="outline" className={SECONDARY_BTN} onClick={() => onEditEvent(ev)}>
                        Edit event
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {otherEvents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Other events
                </p>
                {otherEvents.map((ev) => (
                  <div key={`${ev.id}-${ev.startDate}`} className="rounded-lg border bg-card px-3 py-2 text-sm">
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{labelForEventType(ev.eventType)}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {canManage ? (
              <>
                {!isOrgCalendarMarkAsDropdownValue(markAs) ? (
                  <p className="rounded-lg border border-[#E8E8EF] bg-[#FAFBFD] px-3 py-2 text-sm text-muted-foreground">
                    This date is currently classified as{' '}
                    <span className="font-semibold text-foreground">{defaultTitleForMarkAs(markAs)}</span>.
                    Choose a type below to override it.
                  </p>
                ) : null}
                <CrmFormField label="Mark as" required error={fieldErrors.markAs}>
                  <Select
                    value={isOrgCalendarMarkAsDropdownValue(markAs) ? markAs : undefined}
                    onValueChange={(v) => {
                      setMarkAs(v as OrgCalendarMarkAs);
                      setFieldErrors({});
                    }}
                  >
                    <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                      <SelectValue
                        placeholder={
                          isOrgCalendarMarkAsDropdownValue(markAs)
                            ? 'Select date type'
                            : defaultTitleForMarkAs(markAs)
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_CALENDAR_MARK_AS_DROPDOWN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CrmFormField>

                {showWorkingHint ? (
                  <p className="text-sm text-muted-foreground">
                    Clears calendar exceptions for this date. Attendance and tasks will follow the effective
                    office schedule above unless you choose another type.
                  </p>
                ) : null}

                {showHolidayFields ? (
                  <>
                    <CrmFormField label="Holiday title" required error={fieldErrors.title}>
                      <Input
                        value={title}
                        placeholder={HOLIDAY_TITLE_PLACEHOLDER}
                        className={CRM_PIPELINE_FORM_FIELD_CLASS}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </CrmFormField>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={annual} onCheckedChange={(v) => setAnnual(v === true)} />
                      Repeat every year
                    </label>
                    <CrmFormField label="Notes" optional error={fieldErrors.description}>
                      <Textarea
                        rows={2}
                        value={description}
                        className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </CrmFormField>
                  </>
                ) : null}

                {showWeeklyOffFields ? (
                  <CrmFormField label="Reason" optional error={fieldErrors.description}>
                    <Textarea
                      rows={2}
                      placeholder="Optional note for this weekly off"
                      value={description}
                      className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </CrmFormField>
                ) : null}

                {showSpecialWorkingFields ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CrmFormField label="Working start time" error={fieldErrors.startTimeMinutes}>
                        <AttendanceTimePicker value={startTime} onChange={setStartTime} />
                      </CrmFormField>
                      <CrmFormField label="Working end time" error={fieldErrors.endTimeMinutes}>
                        <AttendanceTimePicker value={endTime} onChange={setEndTime} />
                      </CrmFormField>
                    </div>
                    <CrmFormField label="Notes" optional error={fieldErrors.description}>
                      <Textarea
                        rows={2}
                        value={description}
                        className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </CrmFormField>
                  </>
                ) : null}

                {showHalfDayFields ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CrmFormField label="Start time" error={fieldErrors.startTimeMinutes}>
                        <AttendanceTimePicker value={startTime} onChange={setStartTime} />
                      </CrmFormField>
                      <CrmFormField label="End time" error={fieldErrors.endTimeMinutes}>
                        <AttendanceTimePicker value={endTime} onChange={setEndTime} />
                      </CrmFormField>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Half-day duration: {halfDayDurationMinutes} minutes
                      {minHalfDayMinutes != null
                        ? ` (organisation minimum for half day: ${minHalfDayMinutes} minutes)`
                        : ''}
                    </p>
                    <CrmFormField label="Notes" optional error={fieldErrors.description}>
                      <Textarea
                        rows={2}
                        value={description}
                        className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </CrmFormField>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
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
          {canManage ? (
            <Button type="button" className={PRIMARY_BTN} disabled={pending} onClick={() => void handleSave()}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
