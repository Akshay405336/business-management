'use client';

import { createOrgCalendarEventRequestSchema } from '@techwin/validation';
import type { OrgCalendarEventItem } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import {
  ORG_CALENDAR_DIALOG_BODY,
  ORG_CALENDAR_DIALOG_FOOTER,
  ORG_CALENDAR_DIALOG_SHELL,
} from '../constants/org-calendar-theme';
import { cn } from '@/shared/lib/utils';
import { AttendanceTimePicker } from '@/features/admin/attendance/components/attendance-time-picker';
import {
  minutesToTime12,
  time12ToMinutes,
  type Time12Parts,
} from '@/features/admin/attendance/utils/attendance-settings-time';
import { zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { createOrgCalendarEvent, updateOrgCalendarEvent } from '../api/org-calendar-api';
import { ORG_CALENDAR_EVENT_TYPE_OPTIONS } from '../constants/org-calendar-event-types';

export function OrgCalendarEventDialog({
  open,
  onOpenChange,
  initialDate,
  editEvent,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  editEvent?: OrgCalendarEventItem | null;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const isEdit = Boolean(editEvent);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<(typeof ORG_CALENDAR_EVENT_TYPE_OPTIONS)[number]['value']>(
    'COMPANY_HOLIDAY',
  );
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState<Time12Parts>(() => minutesToTime12(9 * 60 + 30));
  const [endTime, setEndTime] = useState<Time12Parts>(() => minutesToTime12(18 * 60 + 30));
  const [recurrence, setRecurrence] = useState<'NONE' | 'ANNUAL'>('NONE');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description);
      setEventType(editEvent.eventType);
      setStartDate(editEvent.startDate);
      setEndDate(editEvent.endDate);
      setIsFullDay(editEvent.isFullDay);
      setStartTime(minutesToTime12(editEvent.startTimeMinutes ?? 9 * 60 + 30));
      setEndTime(minutesToTime12(editEvent.endTimeMinutes ?? 18 * 60 + 30));
      setRecurrence(editEvent.recurrence);
      setIsActive(editEvent.isActive);
    } else {
      setTitle('');
      setDescription('');
      setEventType('COMPANY_HOLIDAY');
      setStartDate(initialDate);
      setEndDate(initialDate);
      setIsFullDay(true);
      setRecurrence('NONE');
      setIsActive(true);
    }
    setErrors({});
  }, [open, editEvent, initialDate]);

  async function onSubmit() {
    const body = {
      title,
      description,
      eventType,
      startDate,
      endDate,
      isFullDay,
      startTimeMinutes: isFullDay ? null : time12ToMinutes(startTime),
      endTimeMinutes: isFullDay ? null : time12ToMinutes(endTime),
      appliesToAllEmployees: true,
      employeeIds: [],
      recurrence,
      isActive,
    };
    const parsed = createOrgCalendarEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setPending(true);
    try {
      if (isEdit && editEvent) {
        await updateOrgCalendarEvent(editEvent.id, parsed.data);
        toast.success('Calendar event updated.');
      } else {
        await createOrgCalendarEvent(parsed.data);
        toast.success('Calendar event created.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save event.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(ORG_CALENDAR_DIALOG_SHELL, 'max-w-none sm:max-w-none w-[min(100%,720px)]')}>
        <DialogHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <DialogTitle>{isEdit ? 'Edit event' : 'Add calendar event'}</DialogTitle>
        </DialogHeader>
        <div className={cn(ORG_CALENDAR_DIALOG_BODY, 'grid gap-3')}>
          <CrmFormField label="Title" required error={errors.title}>
            <Input className={CRM_PIPELINE_FORM_FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
          </CrmFormField>
          <CrmFormField label="Event type" required error={errors.eventType}>
            <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
              <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_CALENDAR_EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CrmFormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CrmFormField label="Start date" required error={errors.startDate}>
              <Input type="date" className={CRM_PIPELINE_FORM_FIELD_CLASS} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </CrmFormField>
            <CrmFormField label="End date" required error={errors.endDate}>
              <Input type="date" className={CRM_PIPELINE_FORM_FIELD_CLASS} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </CrmFormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isFullDay} onCheckedChange={(v) => setIsFullDay(v === true)} />
            Full day
          </label>
          {!isFullDay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <CrmFormField label="Start time" error={errors.startTimeMinutes}>
                <AttendanceTimePicker value={startTime} onChange={setStartTime} />
              </CrmFormField>
              <CrmFormField label="End time" error={errors.endTimeMinutes}>
                <AttendanceTimePicker value={endTime} onChange={setEndTime} />
              </CrmFormField>
            </div>
          ) : null}
          <CrmFormField label="Recurrence" error={errors.recurrence}>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
              <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">One-time</SelectItem>
                <SelectItem value="ANNUAL">Repeats every year</SelectItem>
              </SelectContent>
            </Select>
          </CrmFormField>
          <CrmFormField label="Description" error={errors.description}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </CrmFormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
            Active
          </label>
        </div>
        <div className={ORG_CALENDAR_DIALOG_FOOTER}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
