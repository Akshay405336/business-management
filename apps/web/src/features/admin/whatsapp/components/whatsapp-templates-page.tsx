'use client';

import type { WhatsAppChannelSummary, WhatsAppTemplateSummary } from '@techwin/contracts';
import { whatsappCreateTemplateRequestSchema } from '@techwin/validation';
import {
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminToast } from '@/features/admin/components/toast';
import { useMyPermissions } from '@/features/admin/org-access/hooks/use-my-permissions';
import { cn } from '@/shared/lib/utils';
import {
  listWhatsAppChannels,
  listWhatsAppTemplates,
  submitWhatsAppTemplate,
  syncWhatsAppTemplates,
} from '../api/whatsapp';
import { describeWhatsAppError } from '../utils/whatsapp-format';
import { WhatsAppTemplateDetailDialog } from './whatsapp-template-detail-dialog';
import { TemplatePreview } from './whatsapp-template-dialog';
import {
  WhatsAppTemplateCard,
  WhatsAppTemplateListRow,
} from './whatsapp-template-card';

const STATUSES = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'] as const;
const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type ViewMode = 'grid' | 'list';

function sortTemplates(
  items: readonly WhatsAppTemplateSummary[],
  sort: SortOption,
): WhatsAppTemplateSummary[] {
  const list = [...items];
  list.sort((a, b) => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    const aTime = a.lastSyncedAt ? Date.parse(a.lastSyncedAt) : 0;
    const bTime = b.lastSyncedAt ? Date.parse(b.lastSyncedAt) : 0;
    if (sort === 'oldest') return aTime - bTime || a.name.localeCompare(b.name);
    return bTime - aTime || a.name.localeCompare(b.name);
  });
  return list;
}

const TOOLBAR_CONTROL_CLASS = 'h-9 shrink-0 rounded-lg border-slate-200 shadow-xs';

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
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
    if (!templates) return null;
    let list = [...templates];
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (template) =>
          template.name.toLowerCase().includes(term) ||
          template.bodyText.toLowerCase().includes(term),
      );
    }
    if (category !== 'all') {
      list = list.filter((template) => template.category.toUpperCase() === category);
    }
    return sortTemplates(list, sort);
  }, [templates, search, category, sort]);

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
    <div className="mx-auto grid w-full max-w-[1400px] gap-4 pb-8 pt-1">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Communications' },
          { label: 'WhatsApp', href: '/admin/whatsapp/channels' },
          { label: 'Templates' },
        ]}
        className="mb-0.5"
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#25D366]/10 text-[#128C7E]"
            aria-hidden="true"
          >
            <MessageCircle className="size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Message templates</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
              Manage your WhatsApp message templates from Meta. Templates are required to message
              customers outside the 24-hour window.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canSync ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(TOOLBAR_CONTROL_CLASS, 'bg-white')}
              disabled={syncing}
              onClick={() => void sync()}
            >
              <RefreshCw className={cn('size-4', syncing && 'animate-spin')} aria-hidden="true" />
              {syncing ? 'Syncing…' : 'Sync from Meta'}
            </Button>
          ) : null}
          {canSubmit ? (
            <Button
              type="button"
              size="sm"
              className={cn(
                TOOLBAR_CONTROL_CLASS,
                'border-0 bg-[#25D366] text-white hover:bg-[#1da851]',
              )}
              disabled={activeChannels.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Create template
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1 basis-[12rem]">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates…"
            className={cn(TOOLBAR_CONTROL_CLASS, 'w-full bg-slate-50/50 pl-9')}
            aria-label="Search templates"
          />
        </div>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger className={cn(TOOLBAR_CONTROL_CLASS, 'w-full sm:w-[10.5rem]')} aria-label="Channel">
            <SelectValue placeholder="All channels" />
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
          <SelectTrigger className={cn(TOOLBAR_CONTROL_CLASS, 'w-full sm:w-[9.5rem]')} aria-label="Status">
            <SelectValue placeholder="All statuses" />
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
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={cn(TOOLBAR_CONTROL_CLASS, 'w-full sm:w-[10rem]')} aria-label="Category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry.charAt(0) + entry.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <SelectTrigger className={cn(TOOLBAR_CONTROL_CLASS, 'w-full sm:w-[10.5rem]')} aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
          </SelectContent>
        </Select>
        <div
          className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5"
          role="group"
          aria-label="View mode"
        >
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="size-8 rounded-md"
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="size-8 rounded-md"
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {visible === null && !loadError ? (
        viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        )
      ) : null}

      {visible?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
          {channels.length === 0 ? (
            <>
              No channel connected.{' '}
              <Link href="/admin/whatsapp/channels" className="font-medium text-[#128C7E] underline">
                Connect WhatsApp
              </Link>{' '}
              first.
            </>
          ) : (
            'No templates match your filters. Sync from Meta to import templates from your WhatsApp Business Account.'
          )}
        </div>
      ) : null}

      {visible && visible.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((template) => (
              <WhatsAppTemplateCard
                key={template.id}
                template={template}
                onView={() => setViewing(template)}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {visible.map((template) => (
              <WhatsAppTemplateListRow
                key={template.id}
                template={template}
                onView={() => setViewing(template)}
              />
            ))}
          </div>
        )
      ) : null}

      <WhatsAppTemplateDetailDialog
        templateId={viewing?.id ?? null}
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        canManage={canSubmit}
        onUpdated={() => void load()}
      />

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
    </div>
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
