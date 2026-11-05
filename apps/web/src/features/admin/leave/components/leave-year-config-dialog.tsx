'use client';

import { createLeaveYearConfigurationRequestSchema } from '@techwin/validation';
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
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { createLeaveYearConfiguration } from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

function defaultYearDates(calendarYear: number) {
  return {
    yearStartDate: `${calendarYear}-01-01`,
    yearEndDate: `${calendarYear}-12-31`,
  };
}

export function LeaveYearConfigDialog({
  open,
  initialCalendarYear,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  initialCalendarYear: number;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const defaults = defaultYearDates(initialCalendarYear);
  const [calendarYear, setCalendarYear] = useState(String(initialCalendarYear));
  const [yearStartDate, setYearStartDate] = useState(defaults.yearStartDate);
  const [yearEndDate, setYearEndDate] = useState(defaults.yearEndDate);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const d = defaultYearDates(initialCalendarYear);
    setCalendarYear(String(initialCalendarYear));
    setYearStartDate(d.yearStartDate);
    setYearEndDate(d.yearEndDate);
    setFieldErrors({});
  }, [open, initialCalendarYear]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = createLeaveYearConfigurationRequestSchema.safeParse({
      calendarYear: Number(calendarYear),
      yearStartDate,
      yearEndDate,
    });
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    try {
      await run(() => createLeaveYearConfiguration(parsed.data));
      toast.success('Leave year configuration created.');
      onOpenChange(false);
      await onCreated();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4">
          <DialogTitle className="text-lg font-semibold">Create leave year</DialogTitle>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="leave-year">Calendar year</CrmFieldLabel>
              <Input
                id="leave-year"
                type="number"
                min={2000}
                max={2100}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                value={calendarYear}
                onChange={(e) => setCalendarYear(e.target.value)}
              />
              <CrmInlineFieldError message={fieldErrors.calendarYear} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="year-start">Year start</CrmFieldLabel>
              <Input
                id="year-start"
                type="date"
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                value={yearStartDate}
                onChange={(e) => setYearStartDate(e.target.value)}
              />
              <CrmInlineFieldError message={fieldErrors.yearStartDate} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="year-end">Year end</CrmFieldLabel>
              <Input
                id="year-end"
                type="date"
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                value={yearEndDate}
                onChange={(e) => setYearEndDate(e.target.value)}
              />
              <CrmInlineFieldError message={fieldErrors.yearEndDate} />
            </div>
          </div>
          <DialogFooter className="border-border shrink-0 border-t px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={PRIMARY_BTN} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Create year
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
