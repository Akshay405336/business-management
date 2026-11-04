'use client';

import type { OrgCalendarEventItem } from '@techwin/contracts';
import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { calendarYearOptions } from '@/features/admin/attendance/utils/calendar-month';
import { cn } from '@/shared/lib/utils';
import {
  deleteOrgCalendarEvent,
  duplicateOrgCalendarHolidays,
  fetchOrgCalendarHolidays,
} from '../api/org-calendar-api';
import { labelForEventType } from '../constants/org-calendar-event-types';
import {
  ORG_CALENDAR_DIALOG_BODY,
  ORG_CALENDAR_DIALOG_FOOTER,
  ORG_CALENDAR_DIALOG_SHELL,
} from '../constants/org-calendar-theme';

export function OrgCalendarHolidaysDialog({
  open,
  onOpenChange,
  onChanged,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
  onEdit: (event: OrgCalendarEventItem) => void;
}) {
  const toast = useAdminToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<readonly OrgCalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState(String(new Date().getFullYear() + 1));
  const [duplicating, setDuplicating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrgCalendarHolidays({
        year,
        search: search || undefined,
        page: 1,
        pageSize: 100,
      });
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  }, [year, search, toast]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function onDelete(id: string) {
    if (!confirm('Delete this holiday?')) return;
    try {
      await deleteOrgCalendarEvent(id);
      toast.success('Holiday deleted.');
      await load();
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function onDuplicateYear() {
    setDuplicating(true);
    try {
      const res = await duplicateOrgCalendarHolidays({
        sourceYear: year,
        targetYear: Number(duplicateTarget),
      });
      toast.success(`Created ${res.created} holiday(s) for ${duplicateTarget}.`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duplicate failed.');
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(ORG_CALENDAR_DIALOG_SHELL, 'max-w-none sm:max-w-none w-[min(100%,900px)]')}>
        <DialogHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <DialogTitle>Manage holidays</DialogTitle>
        </DialogHeader>

        <div className={ORG_CALENDAR_DIALOG_BODY}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Year</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9 w-[120px] rounded-lg bg-[#f7faff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendarYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Search holidays…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(CRM_PIPELINE_SEARCH_INPUT_CLASS, 'max-w-xs')}
            />
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => void load()}>
              Apply
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/70 shadow-sm">
            <div className="max-h-[min(50vh,360px)] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#FAFBFD] text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Holiday name</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Recurrence</th>
                    <th className="w-28 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto size-5 animate-spin" />
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No holidays for this filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr
                        key={`${item.id}-${item.startDate}`}
                        className="border-t border-border/60 bg-white even:bg-[#FFFBEB]/30"
                      >
                        <td className="px-4 py-3 font-medium">{item.title}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {item.startDate}
                          {item.endDate !== item.startDate ? ` → ${item.endDate}` : ''}
                        </td>
                        <td className="px-4 py-3">{labelForEventType(item.eventType)}</td>
                        <td className="px-4 py-3">
                          {item.recurrence === 'ANNUAL' ? (
                            <span className="rounded-md bg-[#FEF9C3] px-2 py-0.5 text-xs font-medium text-[#92400E]">
                              Annual
                            </span>
                          ) : (
                            'One-time'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(item)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(item.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={cn(ORG_CALENDAR_DIALOG_FOOTER, 'justify-between')}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Duplicate {year} to</span>
            <Select value={duplicateTarget} onValueChange={setDuplicateTarget}>
              <SelectTrigger className="h-9 w-[120px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarYearOptions().map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" disabled={duplicating} onClick={() => void onDuplicateYear()}>
              Duplicate year
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
