'use client';

import type { WhatsAppChannelSummary, WhatsAppTemplateSummary } from '@techwin/contracts';
import { whatsappCreateTemplateRequestSchema } from '@techwin/validation';
import { FilePlus2, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { useMyPermissions } from '@/features/admin/org-access/hooks/use-my-permissions';
import { cn } from '@/shared/lib/utils';
import {
  listWhatsAppChannels,
  listWhatsAppTemplates,
  submitWhatsAppTemplate,
  syncWhatsAppTemplates,
} from '../api/whatsapp';
import {
  describeWhatsAppError,
  formatDateTime,
  TEMPLATE_STATUS_CLASS,
} from '../utils/whatsapp-format';
import { WhatsAppPageShell } from './whatsapp-page-shell';
import { TemplatePreview } from './whatsapp-template-dialog';

const STATUSES = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'] as const;

function sampleValues(template: WhatsAppTemplateSummary): string[] {
  return template.parameters.map((parameter) => `{{${parameter.name}}}`);
}

export function WhatsAppTemplatesPage() {
  const toast = useAdminToast();
  const { has } = useMyPermissions();
  const canSubmit = has('whatsapp.templates.manage');
  const canSync = has('whatsapp.templates.manage') || has('whatsapp.channels.manage');

  const [channels, setChannels] = useState<readonly WhatsAppChannelSummary[]>([]);
  const [templates, setTemplates] = useState<readonly WhatsAppTemplateSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [viewing, setViewing] = useState<WhatsAppTemplateSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(
    () =>
      listWhatsAppTemplates({
        channelId: channelId === 'all' ? undefined : channelId,
        status: status === 'all' ? undefined : status,
      })
        .then((response) => {
          setTemplates(response.templates);
          setLoadError(null);
        })
        .catch((error: unknown) =>
          setLoadError(describeWhatsAppError(error, 'Could not load templates.')),
        ),
    [channelId, status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listWhatsAppChannels()
      .then((response) => setChannels(response.channels))
      .catch(() => undefined);
  }, []);

  const activeChannels = channels.filter((channel) => channel.status !== 'DISCONNECTED');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!templates || !term) return templates;
    return templates.filter(
      (template) => template.name.includes(term) || template.bodyText.toLowerCase().includes(term),
    );
  }, [templates, search]);

  const sync = async () => {
    const targets =
      channelId === 'all'
        ? activeChannels
        : activeChannels.filter((channel) => channel.id === channelId);
    if (targets.length === 0) {
      toast.error('Connect a WhatsApp channel first.');
      return;
    }
    setSyncing(true);
    let synced = 0;
    const failures: string[] = [];
    for (const channel of targets) {
      try {
        synced += (await syncWhatsAppTemplates(channel.id)).synced;
      } catch (error) {
        failures.push(`${channel.name}: ${describeWhatsAppError(error)}`);
      }
    }
    setSyncing(false);
    if (failures.length > 0) toast.error(failures.join(' '));
    else toast.success(`Synced ${synced} template${synced === 1 ? '' : 's'} from Meta.`);
    await load();
  };

  return (
    <WhatsAppPageShell
      title="WhatsApp Templates"
      description="Message templates approved by Meta. Templates are required to message customers outside the 24-hour window."
      toolbar={
        <>
          {canSync ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={() => void sync()}
            >
              <RefreshCw className={cn(syncing && 'animate-spin')} aria-hidden="true" />
              {syncing ? 'Syncing…' : 'Sync from Meta'}
            </Button>
          ) : null}
          {canSubmit ? (
            <Button
              type="button"
              size="sm"
              disabled={activeChannels.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <FilePlus2 aria-hidden="true" />
              New template
            </Button>
          ) : null}
        </>
      }
      bottomRow={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="h-8 pl-8"
              aria-label="Search templates"
            />
          </div>
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-40" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry.charAt(0) + entry.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {visible === null && !loadError ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : null}

      {visible?.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border bg-white p-10 text-center text-sm">
          {channels.length === 0 ? (
            <>
              No channel connected.{' '}
              <Link href="/admin/whatsapp/channels" className="font-medium underline">
                Connect WhatsApp
              </Link>{' '}
              first.
            </>
          ) : (
            'No templates yet. Sync from Meta to import the templates on your WhatsApp Business Account.'
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible?.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setViewing(template)}
            className="grid content-start gap-2 rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{template.name}</p>
                <p className="text-muted-foreground text-xs">
                  {template.language} · {template.category.toLowerCase()} · {template.channelName}
                </p>
              </div>
              <Badge variant="outline" className={TEMPLATE_STATUS_CLASS[template.status] ?? ''}>
                {template.status.toLowerCase()}
              </Badge>
            </div>
            <p className="line-clamp-3 text-sm whitespace-pre-wrap text-neutral-700">
              {template.bodyText}
            </p>
            <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-2 text-[11px]">
              <span>
                {template.parameters.length} variable{template.parameters.length === 1 ? '' : 's'}
              </span>
              {!template.sendable ? (
                <Badge variant="outline">Media header — not sendable here</Badge>
              ) : null}
              {template.rejectedReason ? (
                <span className="text-red-600">Reason: {template.rejectedReason}</span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => (open ? undefined : setViewing(null))}
      >
        <DialogContent className="sm:max-w-lg">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.name}</DialogTitle>
                <DialogDescription>
                  {viewing.language} · {viewing.category.toLowerCase()} · {viewing.channelName}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={TEMPLATE_STATUS_CLASS[viewing.status] ?? ''}>
                    {viewing.status.toLowerCase()}
                  </Badge>
                  {viewing.qualityScore ? (
                    <Badge variant="outline">Quality: {viewing.qualityScore}</Badge>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    Last synced {formatDateTime(viewing.lastSyncedAt)}
                  </span>
                </div>
                {viewing.rejectedReason ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Meta rejected this template: {viewing.rejectedReason}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <TemplatePreview template={viewing} values={sampleValues(viewing)} />
                {viewing.parameters.length > 0 ? (
                  <div className="grid gap-1">
                    <p className="text-muted-foreground text-xs font-medium">Variables</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewing.parameters.map((parameter, index) => (
                        <Badge key={index} variant="secondary">
                          {parameter.component.toLowerCase()} {`{{${parameter.name}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit a template to Meta</DialogTitle>
            <DialogDescription>
              Meta reviews every template. It stays pending and cannot be sent until Meta approves
              it.
            </DialogDescription>
          </DialogHeader>
          <CreateTemplateForm
            channels={activeChannels}
            defaultChannelId={channelId === 'all' ? undefined : channelId}
            onCancel={() => setCreateOpen(false)}
            onSubmitted={() => {
              setCreateOpen(false);
              toast.success('Template submitted. It will be usable once Meta approves it.');
              void load();
            }}
          />
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
  );
}

function countBodyVariables(body: string): number {
  const numbers = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) => Number(match[1]));
  return numbers.length === 0 ? 0 : Math.max(...numbers);
}

function CreateTemplateForm({
  channels,
  defaultChannelId,
  onCancel,
  onSubmitted,
}: {
  channels: readonly WhatsAppChannelSummary[];
  defaultChannelId?: string;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [channelId, setChannelId] = useState(() => defaultChannelId ?? channels[0]?.id ?? '');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const variableCount = countBodyVariables(bodyText);
  const exampleValues = Array.from({ length: variableCount }, (_, index) => examples[index] ?? '');

  const submit = async () => {
    const parsed = whatsappCreateTemplateRequestSchema.safeParse({
      channelId,
      name: name.trim(),
      language: language.trim(),
      category,
      headerText: headerText.trim() || undefined,
      bodyText,
      footerText: footerText.trim() || undefined,
      bodyExamples: exampleValues.map((value) => value.trim()),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await submitWhatsAppTemplate(parsed.data);
      onSubmitted();
    } catch (error) {
      setErrors({ form: describeWhatsAppError(error) });
      setSaving(false);
    }
  };

  const preview: WhatsAppTemplateSummary = {
    id: 'preview',
    channelId,
    channelName: '',
    providerTemplateId: null,
    name,
    language,
    category,
    status: 'PENDING',
    rejectedReason: null,
    qualityScore: null,
    bodyText: bodyText || 'Your message body',
    headerText: headerText || null,
    footerText: footerText || null,
    buttons: [],
    parameters: exampleValues.map((_, index) => ({
      component: 'BODY',
      index,
      name: String(index + 1),
    })),
    sendable: true,
    lastSyncedAt: null,
  };

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-red-600">{errors[key]}</p> : null;

  return (
    <form
      className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid content-start gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Channel</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger aria-label="Channel">
                <SelectValue placeholder="Choose a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError('channelId')}
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as typeof category)}
            >
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTILITY">Utility</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              placeholder="order_update"
              value={name}
              onChange={(event) =>
                setName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
              }
            />
            {fieldError('name')}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tpl-language">Language code</Label>
            <Input
              id="tpl-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
            {fieldError('language')}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tpl-header">Header (optional)</Label>
          <Input
            id="tpl-header"
            maxLength={60}
            value={headerText}
            onChange={(event) => setHeaderText(event.target.value)}
          />
          {fieldError('headerText')}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tpl-body">Body</Label>
          <Textarea
            id="tpl-body"
            rows={5}
            maxLength={1024}
            placeholder="Hi {{1}}, your order {{2}} has shipped."
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Use {'{{1}}'}, {'{{2}}'}… for variables, numbered in order.
          </p>
          {fieldError('bodyText')}
        </div>
        {variableCount > 0 ? (
          <div className="grid gap-2">
            <Label>Example values (required by Meta for review)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {exampleValues.map((value, index) => (
                <Input
                  key={index}
                  aria-label={`Example for {{${index + 1}}}`}
                  placeholder={`Example for {{${index + 1}}}`}
                  value={value}
                  onChange={(event) =>
                    setExamples(() => {
                      const next = [...exampleValues];
                      next[index] = event.target.value;
                      return next;
                    })
                  }
                />
              ))}
            </div>
            {fieldError('bodyExamples')}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="tpl-footer">Footer (optional)</Label>
          <Input
            id="tpl-footer"
            maxLength={60}
            value={footerText}
            onChange={(event) => setFooterText(event.target.value)}
          />
        </div>
        {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}
      </div>
      <div className="grid content-start gap-2">
        <p className="text-muted-foreground text-xs font-medium">Preview</p>
        <TemplatePreview template={preview} values={exampleValues} />
      </div>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || channels.length === 0}>
          {saving ? 'Submitting…' : 'Submit for review'}
        </Button>
      </DialogFooter>
    </form>
  );
}
