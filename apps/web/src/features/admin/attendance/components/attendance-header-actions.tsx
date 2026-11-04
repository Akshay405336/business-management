'use client';

import { CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMyPermissions } from '@/features/admin/org-access/hooks/use-my-permissions';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import { AttendanceAddRecordDialog } from './attendance-add-record-dialog';
import { AttendanceCalendarPickerDialog } from './attendance-calendar-picker-dialog';
import { useAttendanceRecordsContext } from './attendance-records-context';

const PRIMARY_BTN =
  'h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-3 text-sm font-medium text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const CALENDAR_BTN =
  'h-9 shrink-0 gap-1.5 px-3 text-sm font-medium shadow-xs';

export function AttendanceHeaderActions({ onShowRecords }: { onShowRecords: () => void }) {
  const records = useAttendanceRecordsContext();
  const { has } = useMyPermissions();
  const canAdd = has('attendance.correct_records');
  const [addOpen, setAddOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateFilterActive =
    records.orgTodayKey != null && records.datePickerValue !== records.orgTodayKey;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            CALENDAR_BTN,
            CRM_PIPELINE_SEARCH_INPUT_CLASS,
            (calendarOpen || dateFilterActive) &&
              'border-[#E8E8EF] bg-white text-[#5B35B5] hover:bg-[#FAFAFF]',
          )}
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen(true)}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          Calendar
        </Button>

        {canAdd ? (
          <Button type="button" size="sm" className={PRIMARY_BTN} onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Attendance
          </Button>
        ) : null}
      </div>

      <AttendanceCalendarPickerDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        onDateApplied={onShowRecords}
      />

      {canAdd ? (
        <AttendanceAddRecordDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          defaultDate={records.datePickerValue || undefined}
          onSaved={() => records.refreshAll()}
        />
      ) : null}
    </>
  );
}
