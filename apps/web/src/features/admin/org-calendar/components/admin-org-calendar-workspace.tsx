'use client';

import type { OrgCalendarEventItem, OrgCalendarMonthDay } from '@techwin/contracts';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { monthBounds, todayKeyInTimeZone } from '@/features/admin/attendance/utils/calendar-month';
import { useAttendanceOrgTimeZone } from '@/features/admin/attendance/hooks/use-attendance-org-timezone';
import { useOrgCalendarMonth } from '../hooks/use-org-calendar-month';
import { OrgCalendarOverviewPanel } from './org-calendar-overview-panel';
import { OrgCalendarEventDialog } from './org-calendar-event-dialog';
import { OrgCalendarHolidaysDialog } from './org-calendar-holidays-dialog';
import { OrgCalendarMonthGrid } from './org-calendar-month-grid';
import { OrgCalendarMonthNav } from './org-calendar-month-nav';
import { OrgCalendarDateManageDialog } from './org-calendar-date-manage-dialog';

const PIPELINE_SECONDARY_BTN =
  'border-input h-9 shrink-0 border bg-neutral-100 text-foreground shadow-none hover:bg-neutral-200/80';

const PIPELINE_PRIMARY_BTN =
  'h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

export function AdminOrgCalendarWorkspace() {
  const access = useAdminAccess();
  const orgTimeZone = useAttendanceOrgTimeZone();
  const orgTodayKey = useMemo(() => todayKeyInTimeZone(orgTimeZone), [orgTimeZone]);
  const today = orgTodayKey;
  const [monthKey, setMonthKey] = useState(() => orgTodayKey.slice(0, 7));
  const { year, monthIndex } = monthBounds(monthKey);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [manageDateKey, setManageDateKey] = useState<string | null>(null);
  const [dateManageOpen, setDateManageOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<OrgCalendarEventItem | null>(null);

  const canManageDate = access.has('calendar.create') || access.has('calendar.update');
  const canCreate = access.has('calendar.create');
  const canManageHolidays = access.has('calendar.manage_holidays');

  const { data, loading, error, reload } = useOrgCalendarMonth({
    year,
    month: monthIndex + 1,
    search: search || undefined,
  });

  const daysByDate = useMemo(() => {
    const map = new Map<string, OrgCalendarMonthDay>();
    for (const day of data?.days ?? []) map.set(day.date, day);
    return map;
  }, [data]);

  const manageDay = manageDateKey ? daysByDate.get(manageDateKey) : undefined;

  function openDateManage(dateKey: string) {
    setManageDateKey(dateKey);
    setSelectedDate(dateKey);
    setDateManageOpen(true);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    openDateManage(dateKey);
  }

  const headerActions =
    canCreate || canManageHolidays ? (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {canManageHolidays ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={PIPELINE_SECONDARY_BTN}
            onClick={() => setHolidaysOpen(true)}
          >
            Manage Holidays
          </Button>
        ) : null}
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            className={PIPELINE_PRIMARY_BTN}
            onClick={() => {
              setEditEvent(null);
              setEventDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Add Event
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Organisation Calendar' }]} className="mb-0.5" />
      <section className="workspace-surface min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
        <CrmToolbarHeader
          title="Organisation Calendar"
          description="Manage holidays, working days and important organisation events."
          layout="inline"
          className="rounded-none border-0 bg-card pb-2 shadow-none"
          headerRowClassName="flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:flex-nowrap"
          toolbarRowClassName="shrink-0"
          toolbar={headerActions}
        />

        <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:items-start">
          <div className="min-w-0 lg:flex-[7] lg:basis-[70%]">
            <OrgCalendarMonthNav
              monthKey={monthKey}
              monthIndex={monthIndex}
              year={year}
              search={search}
              onMonthKeyChange={setMonthKey}
              onSearchChange={setSearch}
              onToday={() => {
                setMonthKey(orgTodayKey.slice(0, 7));
                setSelectedDate(orgTodayKey);
              }}
            />
            {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
            {loading ? (
              <Skeleton className="mt-3 h-[480px] w-full rounded-xl" />
            ) : (
              <div className="mt-3 min-w-0">
                <OrgCalendarMonthGrid
                  year={year}
                  monthIndex={monthIndex}
                  daysByDate={daysByDate}
                  selectedDate={selectedDate}
                  orgTodayKey={orgTodayKey}
                  compact
                  onSelectDate={handleSelectDate}
                  onManageDate={openDateManage}
                  canManageDate={canManageDate}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 lg:flex-[3] lg:basis-[30%]">
            <OrgCalendarOverviewPanel
              monthKey={monthKey}
              days={data?.days ?? []}
              loading={loading}
            />
          </div>
        </div>
      </section>

      <OrgCalendarDateManageDialog
        open={dateManageOpen}
        onOpenChange={setDateManageOpen}
        dateKey={manageDateKey}
        day={manageDay}
        canManage={canManageDate}
        onSaved={reload}
        onEditEvent={(ev) => {
          setEditEvent(ev);
          setDateManageOpen(false);
          setEventDialogOpen(true);
        }}
      />

      <OrgCalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        initialDate={manageDateKey ?? selectedDate ?? today}
        editEvent={editEvent}
        onSaved={reload}
      />
      <OrgCalendarHolidaysDialog
        open={holidaysOpen}
        onOpenChange={setHolidaysOpen}
        onChanged={reload}
        onEdit={(ev) => {
          setEditEvent(ev);
          setHolidaysOpen(false);
          setEventDialogOpen(true);
        }}
      />
    </div>
  );
}
