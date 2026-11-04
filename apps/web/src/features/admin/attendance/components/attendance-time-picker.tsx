'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import type { Time12Parts } from '../utils/attendance-settings-time';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function AttendanceTimePicker({
  value,
  onChange,
  disabled,
  id,
  className,
  'aria-invalid': ariaInvalid,
}: {
  value: Time12Parts;
  onChange: (next: Time12Parts) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <div id={id} className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Select
        disabled={disabled}
        value={String(value.hour12)}
        onValueChange={(v) => onChange({ ...value, hour12: Number(v) })}
      >
        <SelectTrigger
          aria-invalid={ariaInvalid}
          className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'h-11 w-[4.25rem] px-2')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm font-medium">:</span>
      <Select
        disabled={disabled}
        value={String(value.minute)}
        onValueChange={(v) => onChange({ ...value, minute: Number(v) })}
      >
        <SelectTrigger
          aria-invalid={ariaInvalid}
          className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'h-11 w-[4.25rem] px-2')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        disabled={disabled}
        value={value.period}
        onValueChange={(v) => onChange({ ...value, period: v as 'AM' | 'PM' })}
      >
        <SelectTrigger
          aria-invalid={ariaInvalid}
          className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'h-11 w-[5.5rem]')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
