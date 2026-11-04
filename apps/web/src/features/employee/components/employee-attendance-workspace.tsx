'use client';

import type { AttendanceMyTodayResponse, AttendanceRecordItem } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminToast } from '@/features/admin/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchMyAttendanceHistory,
  fetchMyAttendanceSummary,
  fetchMyTodayAttendance,
  punchIn,
  punchOut,
  registerAttendanceDevice,
} from '@/features/attendance/api/attendance';
import { AttendanceStatusBadge } from '@/features/attendance/components/attendance-status-badge';
import { useAttendanceDeviceKey } from '@/features/attendance/hooks/use-attendance-device-key';
import {
  formatDurationMinutes,
  formatIsoTime,
  minutesToLabel,
  monthRange,
} from '@/features/attendance/utils/time';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function EmployeeAttendanceWorkspace() {
  const toast = useAdminToast();
  const deviceKey = useAttendanceDeviceKey();
  const range = useMemo(() => monthRange(), []);
  const [today, setToday] = useState<AttendanceMyTodayResponse | null>(null);
  const [history, setHistory] = useState<readonly AttendanceRecordItem[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchMyAttendanceSummary>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [todayRes, historyRes, summaryRes] = await Promise.all([
      fetchMyTodayAttendance(),
      fetchMyAttendanceHistory(range),
      fetchMyAttendanceSummary(range),
    ]);
    setToday(todayRes);
    setHistory(historyRes);
    setSummary(summaryRes);
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load attendance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const ensureDevice = async () => {
    if (!deviceKey) return;
    try {
      await registerAttendanceDevice({ deviceKey, label: 'This desktop' });
    } catch {
      // already registered
    }
  };

  const onPunchIn = async () => {
    setActing(true);
    try {
      await ensureDevice();
      await punchIn({ deviceKey, idempotencyKey: crypto.randomUUID() });
      toast.success('Punched in');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Punch in failed.');
    } finally {
      setActing(false);
    }
  };

  const onPunchOut = async () => {
    setActing(true);
    try {
      await punchOut({ deviceKey, idempotencyKey: crypto.randomUUID() });
      toast.success('Punched out');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Punch out failed.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  const schedule = today?.schedule;
  const record = today?.record;

  return (
    <div className="mx-auto grid max-w-[1100px] gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm">Punch in and out from a desktop browser only.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today — {today?.attendanceDate}</CardTitle>
          <CardDescription>
            {schedule
              ? `Office ${minutesToLabel(schedule.officeStartMinutes)} – ${minutesToLabel(schedule.officeEndMinutes)} (${schedule.timeZone})`
              : 'Office schedule not configured yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm">
            <p>
              Status:{' '}
              {record ? (
                <AttendanceStatusBadge status={record.status} />
              ) : (
                <AttendanceStatusBadge status="PENDING" />
              )}
            </p>
            <p>Punch in: {formatIsoTime(record?.punchInAt ?? null)}</p>
            <p>Punch out: {formatIsoTime(record?.punchOutAt ?? null)}</p>
            <p>Working: {formatDurationMinutes(record?.workingMinutes)}</p>
            {record && record.lateMinutes > 0 ? (
              <p className="text-amber-700 dark:text-amber-300">Late by {record.lateMinutes} min</p>
            ) : null}
            {!today?.isDesktopSession ? (
              <p className="text-muted-foreground">Mobile view: history only. Use a desktop to punch.</p>
            ) : null}
            {today?.punchBlockedReason ? (
              <p className="text-muted-foreground">{today.punchBlockedReason}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!today?.canPunchIn || acting || !today?.isDesktopSession}
              onClick={() => void onPunchIn()}
            >
              Punch in
            </Button>
            <Button
              variant="secondary"
              disabled={!today?.canPunchOut || acting || !today?.isDesktopSession}
              onClick={() => void onPunchOut()}
            >
              Punch out
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Present', summary.presentDays],
            ['Late', summary.lateDays],
            ['Absent', summary.absentDays],
            ['Hours', Math.round(summary.totalWorkingMinutes / 60)],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-xs">{label as string}</p>
                <p className="text-xl font-semibold">{value as number}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    No records in this range.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.attendanceDate}</TableCell>
                    <TableCell>{formatIsoTime(row.punchInAt)}</TableCell>
                    <TableCell>{formatIsoTime(row.punchOutAt)}</TableCell>
                    <TableCell>{formatDurationMinutes(row.workingMinutes)}</TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
