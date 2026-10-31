'use client';

import type {
  WhatsAppBroadcastAudiencePreview,
  WhatsAppBroadcastAudienceSource,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastStatus,
  WhatsAppBroadcastSummary,
  WhatsAppChannelSummary,
  WhatsAppTemplateSummary,
} from '@techwin/contracts';
import { Megaphone, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import {
  cancelWhatsAppBroadcast,
  createWhatsAppBroadcast,
  fetchWhatsAppBroadcast,
  listWhatsAppBroadcasts,
  listWhatsAppChannels,
  listWhatsAppTemplates,
  previewWhatsAppAudience,
} from '../api/whatsapp';
import { describeWhatsAppError, formatDateTime, newIdempotencyKey } from '../utils/whatsapp-format';
import { WhatsAppPageShell } from './whatsapp-page-shell';
import { renderTemplateText, TemplatePreview } from './whatsapp-template-dialog';

const STATUS_META: Record<WhatsAppBroadcastStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border-neutral-200 bg-neutral-100 text-neutral-600' },
  SCHEDULED: { label: 'Scheduled', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  PROCESSING: { label: 'Sending', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  COMPLETED: { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-neutral-200 bg-neutral-100 text-neutral-500',
  },
  FAILED: { label: 'Failed', className: 'border-red-200 bg-red-50 text-red-700' },
};

const AUDIENCE_LABEL: Record<WhatsAppBroadcastAudienceSource, string> = {
  ALL_OPTED_IN: 'All opted-in contacts',
  CLIENTS: 'Opted-in contacts linked to clients',
  LEADS: 'Opted-in contacts linked to leads',
  SELECTED: 'Selected contacts',
};

const isActive = (status: WhatsAppBroadcastStatus) =>
  status === 'SCHEDULED' || status === 'PROCESSING';

function StatsBar({ stats }: { stats: WhatsAppBroadcastSummary['stats'] }) {
  const total = Math.max(stats.total, 1);
  const segments = [
    { value: stats.read, className: 'bg-emerald-600' },
    { value: stats.delivered - stats.read, className: 'bg-emerald-400' },
    { value: stats.sent - stats.delivered, className: 'bg-sky-400' },
    { value: stats.failed + stats.skipped, className: 'bg-red-400' },
  ];
  return (
    <div className="grid gap-1">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-neutral-100">
        {segments.map((segment, index) =>
          segment.value > 0 ? (
            <span
              key={index}
              className={segment.className}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <span className="text-muted-foreground text-[11px]">
        {stats.sent}/{stats.total} sent · {stats.delivered} delivered · {stats.read} read
        {stats.failed + stats.skipped > 0 ? ` · ${stats.failed + stats.skipped} not sent` : ''}
      </span>
    </div>
  );
}

export function WhatsAppBroadcastsPage() {
  const toast = useAdminToast();
  const [broadcasts, setBroadcasts] = useState<readonly WhatsAppBroadcastSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channels, setChannels] = useState<readonly WhatsAppChannelSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(
    () =>
      listWhatsAppBroadcasts()
        .then((response) => {
          setBroadcasts(response.broadcasts);
          setLoadError(null);
        })
        .catch((error: unknown) =>
          setLoadError(describeWhatsAppError(error, 'Could not load broadcasts.')),
        ),
    [],
  );

  useEffect(() => {
    void load();
    listWhatsAppChannels()
      .then((response) => setChannels(response.channels))
      .catch(() => undefined);
  }, [load]);

  const anyActive = broadcasts?.some((broadcast) => isActive(broadcast.status)) ?? false;
  useEffect(() => {
    if (!anyActive) return;
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [anyActive, load]);

  const sendable = channels.filter((channel) => channel.status !== 'DISCONNECTED');

  return (
    <WhatsAppPageShell
      title="WhatsApp Broadcasts"
      description="Send approved templates to contacts who opted in to WhatsApp messages."
      toolbar={
        <Button
          type="button"
          size="sm"
          disabled={sendable.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          <Megaphone aria-hidden="true" />
          New broadcast
        </Button>
      }
    >
      {sendable.length === 0 && broadcasts !== null ? (
        <Alert variant="info">
          <AlertDescription>
            Broadcasts need a connected WhatsApp channel with approved templates.
          </AlertDescription>
        </Alert>
      ) : null}
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-white">
        {broadcasts === null && !loadError ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : broadcasts?.length === 0 ? (
          <p className="text-muted-foreground p-10 text-center text-sm">No broadcasts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broadcast</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="w-72">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts?.map((broadcast) => (
                <TableRow
                  key={broadcast.id}
                  className="cursor-pointer"
                  onClick={() => setDetailId(broadcast.id)}
                >
                  <TableCell>
                    <p className="font-medium">{broadcast.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {broadcast.channelName} · {AUDIENCE_LABEL[broadcast.audienceSource]}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {broadcast.templateName}{' '}
                    <span className="text-muted-foreground text-xs">
                      ({broadcast.templateLanguage})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_META[broadcast.status].className}>
                      {STATUS_META[broadcast.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(
                      broadcast.scheduledAt ?? broadcast.startedAt ?? broadcast.createdAt,
                    )}
                  </TableCell>
                  <TableCell>
                    <StatsBar stats={broadcast.stats} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New broadcast</DialogTitle>
            <DialogDescription>
              Only contacts with recorded WhatsApp opt-in receive broadcasts. Opted-out contacts are
              always excluded.
            </DialogDescription>
          </DialogHeader>
          <BroadcastWizard
            channels={sendable}
            onCancel={() => setCreateOpen(false)}
            onCreated={(created) => {
              setCreateOpen(false);
              toast.success(created.scheduledAt ? 'Broadcast scheduled.' : 'Broadcast started.');
              void load();
              setDetailId(created.id);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => (open ? undefined : setDetailId(null))}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {detailId ? <BroadcastDetailView id={detailId} onChanged={() => void load()} /> : null}
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
  );
}

function BroadcastDetailView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const toast = useAdminToast();
  const [detail, setDetail] = useState<WhatsAppBroadcastDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(
    () =>
      fetchWhatsAppBroadcast(id)
        .then((next) => {
          setDetail(next);
          setError(null);
        })
        .catch((failure: unknown) =>
          setError(describeWhatsAppError(failure, 'Could not load this broadcast.')),
        ),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const active = detail ? isActive(detail.status) : false;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void load(), 5_000);
    return () => clearInterval(timer);
  }, [active, load]);

  const cancel = async () => {
    setCancelling(true);
    try {
      setDetail(await cancelWhatsAppBroadcast(id));
      toast.success('Broadcast cancelled. Messages already sent cannot be recalled.');
      onChanged();
    } catch (failure) {
      toast.error(describeWhatsAppError(failure));
    } finally {
      setCancelling(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!detail) return <Skeleton className="h-48 w-full" />;

  const counters = [
    { label: 'Recipients', value: detail.stats.total },
    { label: 'Pending', value: detail.stats.pending },
    { label: 'Sent', value: detail.stats.sent },
    { label: 'Delivered', value: detail.stats.delivered },
    { label: 'Read', value: detail.stats.read },
    { label: 'Failed', value: detail.stats.failed },
    { label: 'Skipped', value: detail.stats.skipped },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {detail.name}
          <Badge variant="outline" className={STATUS_META[detail.status].className}>
            {STATUS_META[detail.status].label}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {detail.templateName} ({detail.templateLanguage}) · {detail.channelName} ·{' '}
          {AUDIENCE_LABEL[detail.audienceSource]}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 text-sm">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {counters.map((counter) => (
            <div key={counter.label} className="rounded-lg border p-2 text-center">
              <p className="text-lg font-semibold tabular-nums">{counter.value}</p>
              <p className="text-muted-foreground text-[11px]">{counter.label}</p>
            </div>
          ))}
        </div>
        <StatsBar stats={detail.stats} />
        <div className="text-muted-foreground grid gap-0.5 text-xs">
          <p>Created {formatDateTime(detail.createdAt)}</p>
          {detail.scheduledAt ? <p>Scheduled for {formatDateTime(detail.scheduledAt)}</p> : null}
          {detail.startedAt ? <p>Started {formatDateTime(detail.startedAt)}</p> : null}
          {detail.completedAt ? <p>Completed {formatDateTime(detail.completedAt)}</p> : null}
          {detail.cancelledAt ? <p>Cancelled {formatDateTime(detail.cancelledAt)}</p> : null}
        </div>
        {detail.templateVariables.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {detail.templateVariables.map((value, index) => (
              <Badge key={index} variant="secondary">
                {`{{${index + 1}}}`} = {value}
              </Badge>
            ))}
          </div>
        ) : null}
        {detail.failures.length > 0 ? (
          <div className="grid gap-1.5">
            <p className="font-medium">Not delivered</p>
            <ul className="grid max-h-56 gap-1 overflow-y-auto">
              {detail.failures.map((failure) => (
                <li key={failure.contactId} className="rounded-md border px-2.5 py-1.5 text-xs">
                  <span className="font-medium">{failure.name}</span>{' '}
                  <span className="text-muted-foreground">{failure.phoneE164}</span>
                  <p className="text-red-600">{failure.errorMessage}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {active ? (
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelling}
            onClick={() => void cancel()}
          >
            {cancelling ? 'Cancelling…' : 'Cancel broadcast'}
          </Button>
        </DialogFooter>
      ) : null}
    </>
  );
}

type WizardStep = 'setup' | 'audience' | 'schedule' | 'review';
const STEPS: readonly { id: WizardStep; label: string }[] = [
  { id: 'setup', label: 'Message' },
  { id: 'audience', label: 'Audience' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Confirm' },
];

function BroadcastWizard({
  channels,
  onCancel,
  onCreated,
}: {
  channels: readonly WhatsAppChannelSummary[];
  onCancel: () => void;
  onCreated: (broadcast: WhatsAppBroadcastDetail) => void;
}) {
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [step, setStep] = useState<WizardStep>('setup');
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState(() => channels[0]?.id ?? '');
  const [templates, setTemplates] = useState<readonly WhatsAppTemplateSummary[] | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [source, setSource] = useState<WhatsAppBroadcastAudienceSource>('ALL_OPTED_IN');
  const [audience, setAudience] = useState<WhatsAppBroadcastAudiencePreview | null>(null);
  const [audienceKey, setAudienceKey] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!channelId) return;
    const controller = new AbortController();
    listWhatsAppTemplates({ channelId, status: 'APPROVED' }, controller.signal)
      .then((response) => setTemplates(response.templates.filter((template) => template.sendable)))
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(describeWhatsAppError(failure, 'Could not load templates.'));
      });
    return () => controller.abort();
  }, [channelId]);

  const currentAudienceKey = `${channelId}|${source}`;
  useEffect(() => {
    if (!channelId || step !== 'audience' || audienceKey === currentAudienceKey) return;
    let cancelled = false;
    previewWhatsAppAudience({ channelId, audience: { source } })
      .then((preview) => {
        if (cancelled) return;
        setAudience(preview);
        setAudienceKey(currentAudienceKey);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(describeWhatsAppError(failure, 'Could not preview the audience.'));
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, source, step, audienceKey, currentAudienceKey]);

  const template = useMemo(
    () => templates?.find((entry) => entry.id === templateId) ?? null,
    [templates, templateId],
  );
  const channel = channels.find((entry) => entry.id === channelId) ?? null;
  const audienceReady = audienceKey === currentAudienceKey && audience !== null;
  const scheduledAt = scheduleMode === 'later' && scheduledLocal ? new Date(scheduledLocal) : null;

  const stepError = (target: WizardStep): string | null => {
    if (target === 'setup') {
      if (!name.trim()) return 'Give the broadcast a name.';
      if (!template) return 'Choose an approved template.';
      if (variables.some((value) => !value.trim())) return 'Fill in every template variable.';
    }
    if (target === 'audience') {
      if (!audienceReady || !audience) return 'Wait for the audience preview.';
      if (audience.eligible === 0) return 'No opted-in contacts match this audience.';
    }
    if (target === 'schedule' && scheduleMode === 'later') {
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return 'Choose a date and time.';
    }
    return null;
  };

  const next = () => {
    const problem = stepError(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const index = STEPS.findIndex((entry) => entry.id === step);
    setStep(STEPS[index + 1]?.id ?? 'review');
  };

  const back = () => {
    setError(null);
    const index = STEPS.findIndex((entry) => entry.id === step);
    setStep(STEPS[index - 1]?.id ?? 'setup');
  };

  const create = async () => {
    if (!confirmed || !template) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createWhatsAppBroadcast({
        name: name.trim(),
        channelId,
        templateId: template.id,
        templateVariables: variables.map((value) => value.trim()),
        audience: { source },
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        confirmed: true,
        idempotencyKey,
      });
      onCreated(created);
    } catch (failure) {
      setError(describeWhatsAppError(failure));
      setSaving(false);
    }
  };

  const samplePreview = (values: readonly string[]) =>
    values.map((value) =>
      value
        .replace(/\{\{\s*contact\.name\s*\}\}/gi, 'Priya')
        .replace(/\{\{\s*contact\.phone\s*\}\}/gi, '+91…'),
    );

  return (
    <div className="grid gap-4">
      <ol className="flex gap-1 text-xs">
        {STEPS.map((entry, index) => {
          const current = STEPS.findIndex((item) => item.id === step);
          return (
            <li
              key={entry.id}
              className={cn(
                'flex-1 rounded-md border px-2 py-1 text-center font-medium',
                index === current
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : index < current
                    ? 'text-emerald-700'
                    : 'text-muted-foreground',
              )}
            >
              {index + 1}. {entry.label}
            </li>
          );
        })}
      </ol>

      {step === 'setup' ? (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bc-name">Broadcast name</Label>
            <Input
              id="bc-name"
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Channel</Label>
              <Select
                value={channelId}
                onValueChange={(value) => {
                  setChannelId(value);
                  setTemplates(null);
                  setTemplateId('');
                  setVariables([]);
                }}
              >
                <SelectTrigger aria-label="Channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} · {entry.displayPhoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Approved template</Label>
              <Select
                value={templateId}
                onValueChange={(value) => {
                  setTemplateId(value);
                  const chosen = templates?.find((entry) => entry.id === value);
                  setVariables(chosen ? chosen.parameters.map(() => '') : []);
                }}
              >
                <SelectTrigger aria-label="Template">
                  <SelectValue
                    placeholder={templates === null ? 'Loading…' : 'Choose a template'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} ({entry.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates?.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No approved text templates on this channel.
                </p>
              ) : null}
            </div>
          </div>
          {template ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                {template.parameters.map((parameter, index) => (
                  <div key={index} className="grid gap-1">
                    <Label htmlFor={`bc-var-${index}`}>{`{{${parameter.name}}}`}</Label>
                    <Input
                      id={`bc-var-${index}`}
                      value={variables[index] ?? ''}
                      placeholder="Text or {{contact.name}}"
                      onChange={(event) =>
                        setVariables((current) =>
                          current.map((value, i) => (i === index ? event.target.value : value)),
                        )
                      }
                    />
                  </div>
                ))}
                {template.parameters.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Personalise with {'{{contact.name}}'} or {'{{contact.phone}}'}.
                  </p>
                ) : null}
              </div>
              <TemplatePreview template={template} values={samplePreview(variables)} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'audience' ? (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Send to</Label>
            <Select
              value={source}
              onValueChange={(value) => setSource(value as WhatsAppBroadcastAudienceSource)}
            >
              <SelectTrigger aria-label="Audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_OPTED_IN">{AUDIENCE_LABEL.ALL_OPTED_IN}</SelectItem>
                <SelectItem value="CLIENTS">{AUDIENCE_LABEL.CLIENTS}</SelectItem>
                <SelectItem value="LEADS">{AUDIENCE_LABEL.LEADS}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!audienceReady || !audience ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-semibold text-emerald-800 tabular-nums">
                    {audience.eligible}
                  </p>
                  <p className="text-xs text-emerald-800">Will receive</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">
                    {audience.excludedNoConsent}
                  </p>
                  <p className="text-muted-foreground text-xs">Excluded: no opt-in</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{audience.excludedOptedOut}</p>
                  <p className="text-muted-foreground text-xs">Excluded: opted out</p>
                </div>
              </div>
              {audience.sample.length > 0 ? (
                <div className="grid gap-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Users className="size-3.5" aria-hidden="true" />
                    Sample recipients
                  </p>
                  <ul className="grid gap-0.5 text-xs">
                    {audience.sample.map((entry) => (
                      <li key={entry.contactId}>
                        {entry.name}{' '}
                        <span className="text-muted-foreground">{entry.phoneE164}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {step === 'schedule' ? (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {(['now', 'later'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScheduleMode(mode)}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm',
                  scheduleMode === mode
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'hover:bg-neutral-50',
                )}
              >
                <p className="font-medium">{mode === 'now' ? 'Send now' : 'Schedule'}</p>
                <p className="text-muted-foreground text-xs">
                  {mode === 'now'
                    ? 'Starts within a few seconds of confirming.'
                    : 'Pick a time up to 90 days ahead.'}
                </p>
              </button>
            ))}
          </div>
          {scheduleMode === 'later' ? (
            <div className="grid gap-1.5 sm:w-72">
              <Label htmlFor="bc-when">Send at (your local time)</Label>
              <Input
                id="bc-when"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(event) => setScheduledLocal(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'review' && template && audience ? (
        <div className="grid gap-3 text-sm">
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{name}</dd>
            <dt className="text-muted-foreground">Channel</dt>
            <dd>
              {channel?.name} · {channel?.displayPhoneNumber}
            </dd>
            <dt className="text-muted-foreground">Template</dt>
            <dd>
              {template.name} ({template.language})
            </dd>
            <dt className="text-muted-foreground">Audience</dt>
            <dd>
              {AUDIENCE_LABEL[source]} — <strong>{audience.eligible}</strong> recipient
              {audience.eligible === 1 ? '' : 's'}
            </dd>
            <dt className="text-muted-foreground">When</dt>
            <dd>{scheduledAt ? formatDateTime(scheduledAt.toISOString()) : 'Immediately'}</dd>
          </dl>
          <div className="rounded-lg border bg-neutral-50 p-3 text-xs whitespace-pre-wrap">
            {renderTemplateText(template, samplePreview(variables))}
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
              className="mt-0.5"
            />
            <span>
              I confirm these {audience.eligible} contacts opted in to receive WhatsApp messages
              from us, and this message follows Meta&apos;s Business Messaging Policy. Sent messages
              cannot be recalled.
            </span>
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DialogFooter>
        {step === 'setup' ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={back}>
            Back
          </Button>
        )}
        {step === 'review' ? (
          <Button type="button" disabled={!confirmed || saving} onClick={() => void create()}>
            {saving ? 'Creating…' : scheduledAt ? 'Schedule broadcast' : 'Send broadcast'}
          </Button>
        ) : (
          <Button type="button" onClick={next}>
            Continue
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
