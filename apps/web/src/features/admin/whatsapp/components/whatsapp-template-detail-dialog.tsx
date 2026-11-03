'use client';

import type { WhatsAppTemplateSummary } from '@techwin/contracts';
import { whatsappCreateTemplateRequestSchema } from '@techwin/validation';
import { AlertTriangle, Pencil, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { cn } from '@/shared/lib/utils';
import { fetchWhatsAppTemplate, submitWhatsAppTemplate } from '../api/whatsapp';
import {
  describeWhatsAppError,
  formatDateTime,
  TEMPLATE_STATUS_CLASS,
} from '../utils/whatsapp-format';
import { TemplatePreview } from './whatsapp-template-dialog';

const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;
type Category = (typeof CATEGORIES)[number];

type EditDraft = {
  name: string;
  language: string;
  category: Category;
  headerText: string;
  bodyText: string;
  footerText: string;
  examples: string[];
};

function draftStorageKey(templateId: string) {
  return `whatsapp-template-draft:${templateId}`;
}

export function countBodyVariables(body: string): number {
  const numbers = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) => Number(match[1]));
  return numbers.length === 0 ? 0 : Math.max(...numbers);
}

function sampleValues(template: WhatsAppTemplateSummary): string[] {
  return template.parameters.map((parameter) => `{{${parameter.name}}}`);
}

function suggestedRevisedName(name: string): string {
  const base = name.replace(/_v\d+$/, '');
  const match = name.match(/_v(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 2;
  return `${base}_v${next}`.slice(0, 512);
}

function draftFromTemplate(template: WhatsAppTemplateSummary, revisedName: boolean): EditDraft {
  const bodyVars = countBodyVariables(template.bodyText);
  const bodyExamples = template.parameters
    .filter((parameter) => parameter.component === 'BODY')
    .sort((a, b) => a.index - b.index)
    .map((parameter) => `Sample ${parameter.name}`);

  return {
    name: revisedName ? suggestedRevisedName(template.name) : template.name,
    language: template.language,
    category: (CATEGORIES.includes(template.category as Category)
      ? template.category
      : 'UTILITY') as Category,
    headerText: template.headerText ?? '',
    bodyText: template.bodyText,
    footerText: template.footerText ?? '',
    examples: Array.from({ length: bodyVars }, (_, index) => bodyExamples[index] ?? ''),
  };
}

function readStoredDraft(templateId: string): EditDraft | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(draftStorageKey(templateId));
    if (!raw) return null;
    return JSON.parse(raw) as EditDraft;
  } catch {
    return null;
  }
}

function writeStoredDraft(templateId: string, draft: EditDraft) {
  sessionStorage.setItem(draftStorageKey(templateId), JSON.stringify(draft));
}

function clearStoredDraft(templateId: string) {
  sessionStorage.removeItem(draftStorageKey(templateId));
}

function buildPreviewTemplate(
  source: WhatsAppTemplateSummary,
  draft: EditDraft,
): WhatsAppTemplateSummary {
  const variableCount = countBodyVariables(draft.bodyText);
  const exampleValues = Array.from({ length: variableCount }, (_, index) => draft.examples[index] ?? '');
  return {
    ...source,
    name: draft.name,
    language: draft.language,
    category: draft.category,
    status: 'PENDING',
    headerText: draft.headerText.trim() || null,
    bodyText: draft.bodyText || 'Your message body',
    footerText: draft.footerText.trim() || null,
    parameters: exampleValues.map((_, index) => ({
      component: 'BODY' as const,
      index,
      name: String(index + 1),
    })),
  };
}

type SubmitKind = 'revised' | 'resubmit';

function submitLabel(kind: SubmitKind, saving: boolean): string {
  if (saving) return 'Submitting…';
  return kind === 'revised' ? 'Submit revised template' : 'Resubmit to Meta';
}

export function WhatsAppTemplateDetailDialog({
  templateId,
  open,
  onOpenChange,
  canManage,
  onUpdated,
}: {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onUpdated: () => void;
}) {
  const toast = useAdminToast();
  const [template, setTemplate] = useState<WhatsAppTemplateSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState<SubmitKind | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmLeaveEdit, setConfirmLeaveEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setMode('view');
    setDraft(null);
    setFieldErrors({});
    setFormError(null);
    setConfirmSubmit(null);
    setConfirmDiscard(false);
    setConfirmLeaveEdit(false);
    setHasLocalDraft(false);
  }, []);

  useEffect(() => {
    if (!open || !templateId) {
      setTemplate(null);
      reset();
      return;
    }
    reset();
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchWhatsAppTemplate(templateId, controller.signal)
      .then((detail) => {
        setTemplate(detail);
        setHasLocalDraft(readStoredDraft(templateId) !== null);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(describeWhatsAppError(failure, 'Could not load template.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, templateId, reset]);

  const status = template?.status.toUpperCase() ?? '';
  const isApprovedLike = status === 'APPROVED' || status === 'PAUSED' || status === 'DISABLED';
  const isRejected = status === 'REJECTED';
  const isPending = status === 'PENDING';
  const canSubmitToMeta = canManage && (isApprovedLike || isRejected);
  const canEnterEdit = canManage && !isPending;

  const submitKind: SubmitKind | null = isApprovedLike ? 'revised' : isRejected ? 'resubmit' : null;

  const syncedAdvanced =
    template !== null &&
    (template.buttons.length > 0 ||
      template.parameters.some((parameter) => parameter.component !== 'BODY'));

  const enterEdit = () => {
    if (!template) return;
    const stored = readStoredDraft(template.id);
    const initial =
      stored ??
      draftFromTemplate(template, isApprovedLike);
    setDraft(initial);
    setMode('edit');
    setFieldErrors({});
    setFormError(null);
  };

  const dirty =
    draft !== null &&
    template !== null &&
    JSON.stringify(draft) !== JSON.stringify(draftFromTemplate(template, isApprovedLike));

  const requestClose = () => {
    if (mode === 'edit' && dirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const saveLocalDraft = () => {
    if (!template || !draft) return;
    writeStoredDraft(template.id, draft);
    setHasLocalDraft(true);
  };

  const discardLocalDraft = () => {
    if (!template) return;
    clearStoredDraft(template.id);
    setHasLocalDraft(false);
    setDraft(draftFromTemplate(template, isApprovedLike));
  };

  const previewTemplate = useMemo(() => {
    if (!template || !draft) return template;
    return buildPreviewTemplate(template, draft);
  }, [template, draft]);

  const previewValues = useMemo(() => {
    if (!draft) return template ? sampleValues(template) : [];
    const count = countBodyVariables(draft.bodyText);
    return Array.from({ length: count }, (_, index) => draft.examples[index]?.trim() || `{{${index + 1}}}`);
  }, [draft, template]);

  const runSubmit = async () => {
    if (!template || !draft || !submitKind) return;
    const variableCount = countBodyVariables(draft.bodyText);
    const exampleValues = Array.from({ length: variableCount }, (_, index) => draft.examples[index] ?? '');

    const parsed = whatsappCreateTemplateRequestSchema.safeParse({
      channelId: template.channelId,
      name: draft.name.trim(),
      language: draft.language.trim(),
      category: draft.category,
      headerText: draft.headerText.trim() || undefined,
      bodyText: draft.bodyText,
      footerText: draft.footerText.trim() || undefined,
      bodyExamples: exampleValues.map((value) => value.trim()),
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        next[key] ??= issue.message;
      }
      setFieldErrors(next);
      setConfirmSubmit(null);
      return;
    }

    if (isApprovedLike && parsed.data.name === template.name) {
      setFieldErrors({
        name: 'Choose a new template name. Meta keeps the approved template until the revision is approved.',
      });
      setConfirmSubmit(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSaving(true);
    try {
      const submitted = await submitWhatsAppTemplate(parsed.data);
      clearStoredDraft(template.id);
      setTemplate(submitted);
      setMode('view');
      setDraft(null);
      setConfirmSubmit(null);
      toast.success(
        submitKind === 'revised'
          ? 'Revised template submitted to Meta for review.'
          : 'Template resubmitted to Meta for review.',
      );
      onUpdated();
    } catch (failure) {
      setFormError(describeWhatsAppError(failure));
      setConfirmSubmit(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
      >
        <DialogContent
          className={cn(
            'max-h-[92vh] overflow-y-auto',
            mode === 'edit' ? 'sm:max-w-4xl' : 'sm:max-w-lg',
          )}
        >
          {loading && !template ? (
            <>
              <DialogHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </DialogHeader>
              <Skeleton className="h-40 w-full" />
            </>
          ) : null}

          {loadError ? (
            <>
              <DialogHeader>
                <DialogTitle>Template details</DialogTitle>
              </DialogHeader>
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            </>
          ) : null}

          {template ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{template.name}</DialogTitle>
                    <DialogDescription>
                      {template.language} · {template.category.toLowerCase()} · {template.channelName}
                    </DialogDescription>
                  </div>
                  {mode === 'view' && canEnterEdit ? (
                    <Button type="button" size="sm" variant="outline" onClick={enterEdit}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </DialogHeader>

              {mode === 'view' ? (
                <ViewTemplateBody template={template} hasLocalDraft={hasLocalDraft} />
              ) : draft ? (
                <EditTemplateBody
                  template={template}
                  draft={draft}
                  setDraft={(updater) => setDraft((current) => (current ? updater(current) : current))}
                  fieldErrors={fieldErrors}
                  formError={formError}
                  syncedAdvanced={syncedAdvanced}
                  isApproved={isApprovedLike}
                  hasLocalDraft={hasLocalDraft}
                  previewTemplate={previewTemplate ?? template}
                  previewValues={previewValues}
                  onSaveLocalDraft={saveLocalDraft}
                  onDiscardLocalDraft={discardLocalDraft}
                />
              ) : null}

              {mode === 'view' ? (
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </DialogFooter>
              ) : (
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (dirty) setConfirmLeaveEdit(true);
                        else {
                          setMode('view');
                          setDraft(null);
                        }
                      }}
                    >
                      Back to details
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={saveLocalDraft}>
                      <Save className="size-3.5" aria-hidden="true" />
                      Save local draft
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={requestClose}>
                      Cancel
                    </Button>
                    {canSubmitToMeta && submitKind ? (
                      <Button
                        type="button"
                        disabled={saving}
                        className="border-0 bg-[#25D366] text-white hover:bg-[#1da851]"
                        onClick={() => setConfirmSubmit(submitKind)}
                      >
                        {submitLabel(submitKind, saving)}
                      </Button>
                    ) : null}
                  </div>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSubmit !== null} onOpenChange={(next) => !next && setConfirmSubmit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmSubmit === 'revised' ? 'Submit revised template?' : 'Resubmit template to Meta?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSubmit === 'revised' ? (
                <>
                  This creates a new template submission in Meta. Your approved template{' '}
                  <span className="font-medium">{template?.name}</span> stays active until Meta approves
                  the revision. Editing here does not change the live approved template.
                </>
              ) : (
                <>
                  Meta will review this submission again. If approved, it replaces the rejected version
                  for sending. This uses Meta&apos;s create-template API — there is no in-place edit.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void runSubmit()}>
              {saving ? 'Submitting…' : 'Confirm submission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeaveEdit} onOpenChange={setConfirmLeaveEdit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave edit mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes are not sent to Meta. Save a local draft first if you want to keep them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeaveEdit(false);
                setMode('view');
                setDraft(null);
              }}
            >
              Discard edits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits are not sent to Meta until you submit. You can save a local draft first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                setMode('view');
                setDraft(null);
                onOpenChange(false);
              }}
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ViewTemplateBody({
  template,
  hasLocalDraft,
}: {
  template: WhatsAppTemplateSummary;
  hasLocalDraft: boolean;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={TEMPLATE_STATUS_CLASS[template.status] ?? ''}>
          {template.status.toLowerCase()}
        </Badge>
        {template.providerTemplateId ? (
          <Badge variant="secondary" className="font-mono text-[10px]">
            Meta ID {template.providerTemplateId}
          </Badge>
        ) : (
          <Badge variant="outline">Local / pending sync</Badge>
        )}
        {hasLocalDraft ? (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
            Local draft saved
          </Badge>
        ) : null}
        {template.qualityScore ? (
          <Badge variant="outline">Quality: {template.qualityScore}</Badge>
        ) : null}
        <span className="text-muted-foreground text-xs">
          Last synced {formatDateTime(template.lastSyncedAt)}
        </span>
      </div>
      {template.rejectedReason ? (
        <Alert variant="destructive">
          <AlertDescription>Meta rejected this template: {template.rejectedReason}</AlertDescription>
        </Alert>
      ) : null}
      {template.status.toUpperCase() === 'PENDING' ? (
        <Alert>
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Awaiting Meta review</AlertTitle>
          <AlertDescription>
            Meta does not allow editing a pending submission. Sync from Meta to refresh status, or wait
            for approval before sending messages with this template.
          </AlertDescription>
        </Alert>
      ) : null}
      <TemplatePreview template={template} values={sampleValues(template)} />
      {template.parameters.length > 0 ? (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs font-medium">Variables</p>
          <div className="flex flex-wrap gap-1.5">
            {template.parameters.map((parameter, index) => (
              <Badge key={index} variant="secondary">
                {parameter.component.toLowerCase()} {`{{${parameter.name}}}`}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {template.buttons.length > 0 ? (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs font-medium">Buttons (synced from Meta)</p>
          <div className="flex flex-wrap gap-1.5">
            {template.buttons.map((button, index) => (
              <Badge key={index} variant="outline">
                {button.type.toLowerCase()}: {button.text}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      {!template.sendable && template.status === 'APPROVED' ? (
        <p className="text-muted-foreground text-xs">
          This approved template uses media headers or button types that Techwin cannot parameterize for
          sending. Preview reflects synced content only.
        </p>
      ) : null}
    </div>
  );
}

function EditTemplateBody({
  template,
  draft,
  setDraft,
  fieldErrors,
  formError,
  syncedAdvanced,
  isApproved,
  hasLocalDraft,
  previewTemplate,
  previewValues,
  onSaveLocalDraft,
  onDiscardLocalDraft,
}: {
  template: WhatsAppTemplateSummary;
  draft: EditDraft;
  setDraft: (updater: (current: EditDraft) => EditDraft) => void;
  fieldErrors: Record<string, string>;
  formError: string | null;
  syncedAdvanced: boolean;
  isApproved: boolean;
  hasLocalDraft: boolean;
  previewTemplate: WhatsAppTemplateSummary;
  previewValues: string[];
  onSaveLocalDraft: () => void;
  onDiscardLocalDraft: () => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const variableCount = countBodyVariables(draft.bodyText);
  const exampleValues = Array.from({ length: variableCount }, (_, index) => draft.examples[index] ?? '');

  const insertVariable = () => {
    const nextIndex = variableCount + 1;
    const token = `{{${nextIndex}}}`;
    const element = bodyRef.current;
    if (element) {
      const start = element.selectionStart ?? draft.bodyText.length;
      const end = element.selectionEnd ?? start;
      const nextBody = `${draft.bodyText.slice(0, start)}${token}${draft.bodyText.slice(end)}`;
      setDraft((current) => ({
        ...current,
        bodyText: nextBody,
        examples: [...current.examples, ''],
      }));
      requestAnimationFrame(() => {
        element.focus();
        const pos = start + token.length;
        element.setSelectionRange(pos, pos);
      });
      return;
    }
    setDraft((current) => ({
      ...current,
      bodyText: `${current.bodyText}${current.bodyText ? ' ' : ''}${token}`,
      examples: [...current.examples, ''],
    }));
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? <p className="text-xs text-red-600">{fieldErrors[key]}</p> : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <div className="grid content-start gap-3">
        {isApproved ? (
          <Alert className="border-sky-200 bg-sky-50/80">
            <AlertTitle>Revised template workflow</AlertTitle>
            <AlertDescription>
              Approved templates cannot be updated in Meta. Submit a new template name with your changes.
              <span className="mt-1 block font-medium">{template.name}</span> remains approved until Meta
              approves the revision.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Local edits are a draft until you resubmit. Meta reviews every submission; nothing changes
              on WhatsApp until approval.
            </AlertDescription>
          </Alert>
        )}

        {hasLocalDraft ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs">
            <span className="text-amber-950">You have a saved local draft (not sent to Meta).</span>
            <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onDiscardLocalDraft}>
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset from template
            </Button>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-600">
          <p>
            <span className="font-medium text-slate-800">Channel:</span> {template.channelName}
          </p>
          {template.providerTemplateId ? (
            <p className="mt-0.5 font-mono">
              <span className="font-medium font-sans text-slate-800">Meta template ID:</span>{' '}
              {template.providerTemplateId}
            </p>
          ) : null}
        </div>

        {syncedAdvanced ? (
          <Alert variant="default" className="border-slate-200">
            <AlertDescription>
              Buttons and non-text headers from the synced template are shown in the preview but cannot be
              changed or re-submitted through Techwin. Only text header, body, and footer are sent to Meta.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="detail-tpl-name">Template name</Label>
            <Input
              id="detail-tpl-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                }))
              }
            />
            {isApproved ? (
              <p className="text-muted-foreground text-xs">Must differ from the approved name.</p>
            ) : null}
            {fieldError('name')}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="detail-tpl-language">Language</Label>
            <Input
              id="detail-tpl-language"
              value={draft.language}
              onChange={(event) =>
                setDraft((current) => ({ ...current, language: event.target.value }))
              }
            />
            {fieldError('language')}
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select
              value={draft.category}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, category: value as Category }))
              }
            >
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry.charAt(0) + entry.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError('category')}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="detail-tpl-header">Header (text only)</Label>
          <Input
            id="detail-tpl-header"
            maxLength={60}
            value={draft.headerText}
            onChange={(event) =>
              setDraft((current) => ({ ...current, headerText: event.target.value }))
            }
          />
          {fieldError('headerText')}
        </div>

        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="detail-tpl-body">Body</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={insertVariable}>
              Insert {`{{${variableCount + 1}}}`}
            </Button>
          </div>
          <Textarea
            ref={bodyRef}
            id="detail-tpl-body"
            rows={6}
            maxLength={1024}
            value={draft.bodyText}
            onChange={(event) => {
              const nextBody = event.target.value;
              const nextCount = countBodyVariables(nextBody);
              setDraft((current) => ({
                ...current,
                bodyText: nextBody,
                examples: Array.from({ length: nextCount }, (_, index) => current.examples[index] ?? ''),
              }));
            }}
          />
          <p className="text-muted-foreground text-xs">
            Variables must be numbered in order: {'{{1}}'}, {'{{2}}'}…
          </p>
          {fieldError('bodyText')}
        </div>

        {variableCount > 0 ? (
          <div className="grid gap-2">
            <Label>Example values (required by Meta)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {exampleValues.map((value, index) => (
                <Input
                  key={index}
                  aria-label={`Example for {{${index + 1}}}`}
                  placeholder={`Example for {{${index + 1}}}`}
                  value={value}
                  onChange={(event) =>
                    setDraft((current) => {
                      const next = [...exampleValues];
                      next[index] = event.target.value;
                      return { ...current, examples: next };
                    })
                  }
                />
              ))}
            </div>
            {fieldError('bodyExamples')}
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="detail-tpl-footer">Footer (optional)</Label>
          <Input
            id="detail-tpl-footer"
            maxLength={60}
            value={draft.footerText}
            onChange={(event) =>
              setDraft((current) => ({ ...current, footerText: event.target.value }))
            }
          />
        </div>

        {template.buttons.length > 0 ? (
          <div className="grid gap-1.5 opacity-80">
            <Label>Buttons (read-only)</Label>
            <div className="flex flex-wrap gap-1.5">
              {template.buttons.map((button, index) => (
                <Badge key={index} variant="outline">
                  {button.type}: {button.text}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      </div>

      <div className="grid content-start gap-2 lg:sticky lg:top-0">
        <p className="text-muted-foreground text-xs font-medium">Live preview</p>
        <TemplatePreview template={previewTemplate} values={previewValues} />
        <Button type="button" variant="ghost" size="sm" className="justify-start text-xs" onClick={onSaveLocalDraft}>
          <Save className="size-3.5" aria-hidden="true" />
          Save local draft
        </Button>
      </div>
    </div>
  );
}
