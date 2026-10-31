'use client';

import type { WhatsAppAnalyticsResponse, WhatsAppChannelSummary } from '@techwin/contracts';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchWhatsAppAnalytics, listWhatsAppChannels } from '../api/whatsapp';
import { describeWhatsAppError } from '../utils/whatsapp-format';
import { WhatsAppPageShell } from './whatsapp-page-shell';

function isoDay(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p> : null}
    </div>
  );
}

export function WhatsAppReportsPage() {
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [channelId, setChannelId] = useState('all');
  const [channels, setChannels] = useState<readonly WhatsAppChannelSummary[]>([]);
  const [data, setData] = useState<WhatsAppAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWhatsAppChannels()
      .then((response) => setChannels(response.channels))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!from || !to) return;
    const controller = new AbortController();
    fetchWhatsAppAnalytics(
      { from, to, channelId: channelId === 'all' ? undefined : channelId },
      controller.signal,
    )
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(describeWhatsAppError(failure, 'Could not load reports.'));
      });
    return () => controller.abort();
  }, [from, to, channelId]);

  return (
    <WhatsAppPageShell
      title="WhatsApp Reports"
      description="Message volume, delivery, response times and team workload."
      bottomRow={
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="h-8 w-40"
            aria-label="From"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className="h-8 w-40"
            aria-label="To"
          />
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="h-8 w-48" aria-label="Channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Messages received" value={data.messages.inbound} />
            <Kpi label="Messages sent" value={data.messages.outbound} />
            <Kpi
              label="Delivered"
              value={data.messages.delivered}
              hint={`${rate(data.messages.delivered, data.messages.outbound)} of sent`}
            />
            <Kpi
              label="Read"
              value={data.messages.read}
              hint={`${rate(data.messages.read, data.messages.outbound)} of sent`}
            />
            <Kpi label="Failed sends" value={data.messages.failed} />
            <Kpi label="Conversations started" value={data.conversations.started} />
            <Kpi label="Resolved" value={data.conversations.resolved} />
            <Kpi
              label="Avg. first response"
              value={formatDuration(data.conversations.averageFirstResponseSeconds)}
              hint={`${data.conversations.open} open · ${data.conversations.unassigned} unassigned now`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border bg-white">
              <h3 className="border-b px-4 py-2.5 text-sm font-semibold">By channel</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byChannel.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center text-sm">
                        No activity in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byChannel.map((row) => (
                      <TableRow key={row.channelId}>
                        <TableCell>{row.channelName}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.inbound}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.outbound}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            <section className="overflow-hidden rounded-xl border bg-white">
              <h3 className="border-b px-4 py-2.5 text-sm font-semibold">By agent</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byAgent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center text-sm">
                        No assigned conversations in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byAgent.map((row) => (
                      <TableRow key={row.employeeId}>
                        <TableCell>{row.displayName}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.assigned}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.resolved}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Broadcasts" value={data.broadcasts.total} />
            <Kpi label="Broadcast recipients" value={data.broadcasts.recipients} />
            <Kpi
              label="Broadcast failures"
              value={data.broadcasts.failed}
              hint={`${rate(data.broadcasts.failed, data.broadcasts.recipients)} of recipients`}
            />
          </div>
        </>
      )}
    </WhatsAppPageShell>
  );
}
