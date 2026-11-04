'use client';

import type { AttendanceMyTodayResponse } from '@techwin/contracts';
import type { AttendanceStatus } from '@techwin/contracts';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDesktopBrowserSession } from '@/features/attendance/utils/device-eligibility';
import {
  formatAttendanceDate,
  formatElapsedWorking,
  formatIsoTime,
  formatLateDuration,
  formatWorkingHoursClock,
  minutesToLabel,
  weekdayLabel,
} from '@/features/attendance/utils/time';
import { cn } from '@/shared/lib/utils';
import { deriveEmployeeTodayPhase } from '../utils/employee-attendance-today-state';

const DESKTOP_ONLY_MESSAGE = 'Attendance punching is available only from a desktop browser.';
const EMPTY = '--';

function MetricColumn({
  icon,
  iconWrapClassName,
  label,
  children,
  className,
}: {
  icon: ReactNode;
  iconWrapClassName: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-[8.5rem] flex-1 items-start gap-2.5 border-[#F3F4F6] px-3 py-3 sm:min-w-0 sm:border-r sm:last:border-r-0',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent',
          iconWrapClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function TodayStatusPill({
  phase,
  today,
}: {
  phase: ReturnType<typeof deriveEmployeeTodayPhase>;
  today: AttendanceMyTodayResponse;
}) {
  if (phase === 'not_punched') {
    const label =
      today.dayKind === 'HOLIDAY' ? 'Holiday' : today.dayKind === 'WEEKLY_OFF' ? 'Weekly off' : 'Not Punched';
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold text-[#64748B]">
        <span className="size-1.5 rounded-full bg-[#94A3B8]" aria-hidden />
        {label}
      </span>
    );
  }

  const status = today.record?.status ?? 'PENDING';
  const styles: Partial<Record<AttendanceStatus, string>> = {
    PRESENT: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#047857]',
    LATE: 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]',
    ABSENT: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
    HALF_DAY: 'border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]',
    PENDING: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]',
  };
  const dot: Partial<Record<AttendanceStatus, string>> = {
    PRESENT: 'bg-emerald-500',
    LATE: 'bg-orange-500',
    ABSENT: 'bg-red-500',
    HALF_DAY: 'bg-violet-500',
    PENDING: 'bg-slate-400',
  };
  const label =
    status === 'LATE'
      ? 'Late'
      : status === 'PRESENT' || status === 'PENDING'
        ? 'Present'
        : status.replace('_', ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold capitalize',
        styles[status] ?? styles.PENDING,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot[status] ?? dot.PENDING)} aria-hidden />
      {label}
    </span>
  );
}

export function EmployeeAttendanceTodayCard({
  today,
  loading,
  clockMs,
  punchAction,
  onPunchIn,
  onPunchOut,
}: {
  today: AttendanceMyTodayResponse | null;
  loading: boolean;
  clockMs: number;
  punchAction: 'in' | 'out' | null;
  onPunchIn: () => void;
  onPunchOut: () => void;
}) {
  const desktopUi = isDesktopBrowserSession();
  const schedule = today?.schedule;
  const timeZone = schedule?.timeZone ?? 'UTC';
  const record = today?.record;
  const phase = deriveEmployeeTodayPhase(today);
  const acting = punchAction !== null;

  const punchAllowed = desktopUi && Boolean(today?.isDesktopSession);
  const showPunchIn = phase === 'not_punched' && punchAllowed;
  const showPunchOut = phase === 'active' && punchAllowed;

  const canPunchIn = showPunchIn && Boolean(today?.canPunchIn);
  const canPunchOut = showPunchOut && Boolean(today?.canPunchOut);

  const workingHoursDisplay = (() => {
    if (phase === 'not_punched') return EMPTY;
    if (phase === 'completed') return formatWorkingHoursClock(record?.workingMinutes ?? null);
    if (record?.punchInAt) return formatElapsedWorking(record.punchInAt, clockMs);
    return EMPTY;
  })();

  const showLateBy = record && record.lateMinutes > 0 && phase !== 'not_punched';
  const dayNum = today?.attendanceDate?.slice(8, 10) ?? '--';

  const officeLine = schedule
    ? `${minutesToLabel(schedule.officeStartMinutes)} – ${minutesToLabel(schedule.officeEndMinutes)}`
    : 'Not configured';

  const showLateBanner = Boolean(showLateBy);
  const showCompleteBanner = phase === 'completed';
  const showInfoFooter =
    !showLateBanner &&
    !showCompleteBanner &&
    Boolean(today?.punchBlockedReason) &&
    !showPunchIn &&
    !showPunchOut;

  return (
    <section
      className="overflow-hidden rounded-xl border border-[#E8E8EF] bg-white shadow-none"
      aria-label="Today's attendance"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#F3EEFF] text-[#6D28D9]">
            <CalendarDays className="size-[18px]" strokeWidth={2} aria-hidden />
          </div>
          <h2 className="text-base font-bold text-[#1E293B]">Today&apos;s Attendance</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {phase === 'completed' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#059669]">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Day Complete
            </span>
          ) : null}
          {phase === 'active' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#6D28D9]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#7C3AED]" aria-hidden />
              In progress
            </span>
          ) : null}

          {showPunchIn ? (
            <Button
              type="button"
              className="h-9 bg-[#5B35B5] px-4 text-sm font-medium text-white shadow-xs hover:bg-[#4C2D96]"
              disabled={!canPunchIn || acting}
              onClick={onPunchIn}
            >
              {punchAction === 'in' ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                  Punching in…
                </>
              ) : (
                'Punch In'
              )}
            </Button>
          ) : null}

          {showPunchOut ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 border-[#E8E8EF] bg-white px-4 text-sm shadow-xs"
              disabled={!canPunchOut || acting}
              onClick={onPunchOut}
            >
              {punchAction === 'out' ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                  Punching out…
                </>
              ) : (
                'Punch Out'
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {loading && !today ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-5">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading today&apos;s attendance…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] lg:min-w-0">
            <MetricColumn
              label="Date"
              iconWrapClassName="bg-[#F3EEFF] text-[#7C3AED]"
              icon={<span className="text-sm font-bold leading-none tabular-nums">{dayNum}</span>}
            >
              {today ? (
                <>
                  <p className="text-sm font-bold text-[#1E293B]">
                    {formatAttendanceDate(today.attendanceDate, timeZone)}
                  </p>
                  <p className="text-xs font-medium text-[#94A3B8]">
                    {weekdayLabel(today.attendanceDate, timeZone)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-[#1E293B]">{EMPTY}</p>
              )}
            </MetricColumn>

            <MetricColumn
              label="Office time"
              iconWrapClassName="bg-[#F8FAFC] text-[#64748B] border-[#E8E8EF]"
              icon={<Clock className="size-4" strokeWidth={2} aria-hidden />}
            >
              <p className="text-sm font-bold tabular-nums text-[#1E293B]">{officeLine}</p>
            </MetricColumn>

            <MetricColumn
              label="Punch in"
              iconWrapClassName="bg-[#ECFDF5] text-[#059669]"
              icon={<LogIn className="size-4" strokeWidth={2.25} aria-hidden />}
            >
              <p className="text-sm font-bold tabular-nums text-[#1E293B]">
                {phase === 'not_punched' ? EMPTY : formatIsoTime(record?.punchInAt ?? null, timeZone)}
              </p>
            </MetricColumn>

            <MetricColumn
              label="Punch out"
              iconWrapClassName="bg-[#FEF2F2] text-[#DC2626]"
              icon={<LogOut className="size-4" strokeWidth={2.25} aria-hidden />}
            >
              <p className="text-sm font-bold tabular-nums text-[#1E293B]">
                {phase === 'completed' ? formatIsoTime(record?.punchOutAt ?? null, timeZone) : EMPTY}
              </p>
            </MetricColumn>

            <MetricColumn
              label="Working hours"
              iconWrapClassName="bg-[#F3EEFF] text-[#7C3AED]"
              icon={<Layers className="size-4" strokeWidth={2} aria-hidden />}
            >
              <p
                className={cn(
                  'text-sm font-bold tabular-nums',
                  phase === 'active' ? 'text-[#6D28D9]' : 'text-[#1E293B]',
                )}
              >
                {workingHoursDisplay}
              </p>
            </MetricColumn>

            <div className="flex min-w-[7rem] flex-1 flex-col justify-center px-3 py-3 sm:min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-[#94A3B8] uppercase">Status</p>
              <div className="mt-1.5">
                {today ? <TodayStatusPill phase={phase} today={today} /> : <span>{EMPTY}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLateBanner || showCompleteBanner ? (
        <div
          className={cn(
            'mx-4 mb-4 mt-1 rounded-xl px-4 py-3 sm:mx-5',
            showLateBanner && showCompleteBanner
              ? 'bg-[#FFF7ED]'
              : showCompleteBanner
                ? 'bg-[#ECFDF5]'
                : 'bg-[#FFF7ED]',
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
            {showLateBanner ? (
              <div className="flex items-center gap-2 sm:pr-4">
                <Clock className="size-4 shrink-0 text-[#EA580C]" aria-hidden />
                <span className="text-sm font-bold text-[#C2410C]">
                  Late by {formatLateDuration(record!.lateMinutes)}
                </span>
              </div>
            ) : null}
            {showLateBanner && showCompleteBanner ? (
              <div className="hidden h-8 w-px shrink-0 bg-[#FDBA74]/60 sm:block" aria-hidden />
            ) : null}
            {showCompleteBanner ? (
              <div className={cn('flex items-center gap-2', showLateBanner ? 'sm:pl-4' : '')}>
                <CheckCircle2 className="size-4 shrink-0 text-[#059669]" aria-hidden />
                <span className="text-sm font-semibold text-[#047857]">
                  Your attendance for today has been completed.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!desktopUi || (today && !today.isDesktopSession && phase !== 'completed') ? (
        <p className="border-t border-[#F3F4F6] px-4 py-2 text-xs text-[#64748B] sm:px-5">{DESKTOP_ONLY_MESSAGE}</p>
      ) : null}

      {showInfoFooter && today?.punchBlockedReason ? (
        <p className="border-t border-[#F3F4F6] px-4 py-2 text-xs text-[#64748B] sm:px-5">{today.punchBlockedReason}</p>
      ) : null}
    </section>
  );
}
