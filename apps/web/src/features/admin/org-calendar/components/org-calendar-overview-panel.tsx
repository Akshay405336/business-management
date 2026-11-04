'use client';

import type { OrgCalendarMonthDay } from '@techwin/contracts';
import { Briefcase, CalendarDays, CalendarOff, Palmtree, Sun } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAttendanceSettings } from '@/features/attendance/api/attendance';
import { WEEKDAY_UI_ROWS } from '@/features/admin/attendance/utils/attendance-settings-time';
import { cn } from '@/shared/lib/utils';
import { computeOrgCalendarMonthSummary } from '../utils/org-calendar-month-summary';

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CalendarDays;
  tone: 'green' | 'yellow' | 'purple' | 'slate';
}) {
  const toneClass = {
    green: 'border-[#86EFAC]/60 bg-[#E8F8F0] text-[#166534]',
    yellow: 'border-[#FBBF24]/60 bg-[#FEF9C3] text-[#B45309]',
    purple: 'border-[#A78BFA]/60 bg-[#F3EEFF] text-[#6D28D9]',
    slate: 'border-[#E5E7EB] bg-[#F9FAFB] text-[#475569]',
  }[tone];

  return (
    <div className={cn('rounded-lg border p-3 shadow-sm', toneClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight opacity-90">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
        <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#E8E8EF] bg-white px-3 py-2 text-sm shadow-xs">
      <span className="text-[#475569]">{label}</span>
      <span className="font-semibold tabular-nums text-[#1E293B]">{value}</span>
    </div>
  );
}

export function OrgCalendarOverviewPanel({
  monthKey,
  days,
  loading,
}: {
  monthKey: string;
  days: readonly OrgCalendarMonthDay[];
  loading?: boolean;
}) {
  const summary = useMemo(
    () => computeOrgCalendarMonthSummary({ monthKey, days }),
    [monthKey, days],
  );

  const [scheduleLine, setScheduleLine] = useState<string | null>(null);
  const [weeklyOffLine, setWeeklyOffLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAttendanceSettings().then((res) => {
      if (cancelled || !res.current) return;
      const working = res.current.workingDays
        .map((d) => WEEKDAY_UI_ROWS.find((r) => r.day === d)?.label)
        .filter(Boolean)
        .join(', ');
      const off = res.current.weeklyOffDays
        .map((d) => WEEKDAY_UI_ROWS.find((r) => r.day === d)?.label)
        .filter(Boolean)
        .join(', ');
      setScheduleLine(working || 'Not configured');
      setWeeklyOffLine(off || 'Not configured');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      className="flex min-w-0 flex-col rounded-xl border border-[#E8E8EF] bg-white p-4 shadow-sm lg:sticky lg:top-4"
      aria-label="Calendar overview"
    >
      <div className="mb-4 border-b border-[#E8E8EF] pb-3">
        <h3 className="text-base font-semibold text-[#1E293B]">Calendar Overview</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {summary.monthLabel}
          <span className="text-[#94A3B8]"> · selected month</span>
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total calendar days" value={summary.totalCalendarDays} icon={CalendarDays} tone="slate" />
            <StatCard label="Working days" value={summary.totalWorkingDays} icon={Briefcase} tone="green" />
            <StatCard label="Holidays" value={summary.totalHolidays} icon={Palmtree} tone="yellow" />
            <StatCard label="Weekly offs" value={summary.totalWeeklyOffs} icon={CalendarOff} tone="purple" />
            <StatCard label="Non-working days" value={summary.totalNonWorkingDays} icon={Sun} tone="slate" />
          </div>

          <SectionBlock title="Holiday overview">
            <Row label="Public holidays" value={summary.publicHolidays} />
            <Row label="Office holidays (company)" value={summary.companyHolidays} />
          </SectionBlock>

          <SectionBlock title="Working schedule">
            <div className="rounded-md border border-[#E8E8EF] bg-[#FAFBFD] px-3 py-2 text-xs text-[#475569]">
              <p>
                <span className="font-semibold text-[#334155]">Working weekdays: </span>
                {scheduleLine ?? '…'}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-[#334155]">Weekly off days: </span>
                {weeklyOffLine ?? '…'}
              </p>
            </div>
          </SectionBlock>
        </div>
      )}
    </aside>
  );
}
