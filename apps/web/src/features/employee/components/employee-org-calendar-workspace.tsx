'use client';

import { useMemo, useState } from 'react';
import type { OrgCalendarMonthDay, OrgCalendarMonthResponse } from '@techwin/contracts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  localTodayKey,
  monthBounds,
} from '@/features/admin/attendance/utils/calendar-month';
import { OrgCalendarMonthGrid } from '@/features/admin/org-calendar/components/org-calendar-month-grid';
import { OrgCalendarMonthNav } from '@/features/admin/org-calendar/components/org-calendar-month-nav';
import { OrgCalendarDateManageDialog } from '@/features/admin/org-calendar/components/org-calendar-date-manage-dialog';
import { fetchEmployeeOrgCalendarMonth } from '@/features/admin/org-calendar/api/org-calendar-api';
import { useEffect, useRef } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { isAbortError } from '@/shared/lib/abort-error';
import { isApiError } from '@/shared/api/api-error';

function useEmployeeOrgCalendarMonth(params: { year: number; month: number }) {
  const { refresh: refreshPermissions } = usePermissions();
  const [data, setData] = useState<OrgCalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const load = async () => {
      const query = { year: params.year, month: params.month };
      try {
        const month = await fetchEmployeeOrgCalendarMonth(query, controller.signal);
        if (!controller.signal.aborted) setData(month);
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return;
        if (isApiError(err) && err.status === 403) {
          await refreshPermissions();
          try {
            const month = await fetchEmployeeOrgCalendarMonth(query, controller.signal);
            if (!controller.signal.aborted) {
              setData(month);
              return;
            }
          } catch (retryErr) {
            if (isAbortError(retryErr) || controller.signal.aborted) return;
            setError(retryErr instanceof Error ? retryErr.message : 'Failed to load calendar.');
            return;
          }
        }
        setError(err instanceof Error ? err.message : 'Failed to load calendar.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [params.year, params.month, refreshPermissions]);

  return { data, loading, error };
}

export function EmployeeOrgCalendarWorkspace() {
  const today = localTodayKey();
  const [monthKey, setMonthKey] = useState(today.slice(0, 7));
  const { year, monthIndex } = monthBounds(monthKey);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [manageDateKey, setManageDateKey] = useState<string | null>(null);
  const [dateManageOpen, setDateManageOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, loading, error } = useEmployeeOrgCalendarMonth({ year, month: monthIndex + 1 });

  const daysByDate = useMemo(() => {
    const map = new Map<string, OrgCalendarMonthDay>();
    for (const day of data?.days ?? []) map.set(day.date, day);
    return map;
  }, [data]);

  const manageDay = manageDateKey ? daysByDate.get(manageDateKey) : undefined;

  function openDetails(dateKey: string) {
    setManageDateKey(dateKey);
    setSelectedDate(dateKey);
    setDateManageOpen(true);
  }

  return (
    <div className="grid gap-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">Organisation calendar</h1>
        <p className="text-sm text-muted-foreground">
          Holidays, weekly offs and company events for your organisation (read-only).
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <OrgCalendarMonthNav
          monthKey={monthKey}
          monthIndex={monthIndex}
          year={year}
          search={search}
          onMonthKeyChange={setMonthKey}
          onSearchChange={setSearch}
          showSearch={false}
          onToday={() => {
            setMonthKey(today.slice(0, 7));
            setSelectedDate(today);
          }}
        />
        <div className="p-3 sm:p-5">
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <Skeleton className="h-[480px] w-full rounded-xl" />
          ) : (
            <OrgCalendarMonthGrid
              year={year}
              monthIndex={monthIndex}
              daysByDate={daysByDate}
              selectedDate={selectedDate}
              onSelectDate={openDetails}
              canManageDate={false}
            />
          )}
        </div>
      </section>

      <OrgCalendarDateManageDialog
        open={dateManageOpen}
        onOpenChange={setDateManageOpen}
        dateKey={manageDateKey}
        day={manageDay}
        canManage={false}
        onSaved={async () => {}}
        onEditEvent={() => {}}
      />
    </div>
  );
}
