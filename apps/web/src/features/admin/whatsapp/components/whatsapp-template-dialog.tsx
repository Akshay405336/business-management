'use client';

import type { WhatsAppTemplateSummary } from '@techwin/contracts';
import { useEffect, useMemo, useState } from 'react';
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
import { cn } from '@/shared/lib/utils';
import { listWhatsAppTemplates } from '../api/whatsapp';
import { describeWhatsAppError } from '../utils/whatsapp-format';

/** Fills {{n}} / {{name}} placeholders in display order, mirroring the server preview. */
export function renderTemplateText(
  template: WhatsAppTemplateSummary,
  values: readonly string[],
): string {
  let cursor = 0;
  const fill = (text: string) =>
    text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match) => {
      const value = values[cursor++];
      return value && value.trim() ? value : match;
    });
  return [
    template.headerText ? fill(template.headerText) : '',
    fill(template.bodyText),
    template.footerText ?? '',
  ]
    .filter((part) => part.trim())
    .join('\n\n');
}

export function TemplatePreview({
  template,
  values,
}: {
  template: WhatsAppTemplateSummary;
  values: readonly string[];
}) {
  return (
    <div className="rounded-lg bg-[#e7f3ec] p-3">
      <div className="grid gap-1.5 rounded-lg bg-white p-3 text-sm shadow-xs">
        <p className="break-words whitespace-pre-wrap">{renderTemplateText(template, values)}</p>
        {template.buttons.length > 0 ? (
          <div className="grid gap-1 border-t pt-1.5">
            {template.buttons.map((button, index) => (
              <span key={index} className="text-center text-xs font-medium text-sky-700">
                {button.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TemplateSendDialog({
  open,
  channelId,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  channelId: string;
  onOpenChange: (open: boolean) => void;
  onSend: (templateId: string, variables: string[]) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send template</DialogTitle>
          <DialogDescription>
            Only templates approved by Meta can be sent. Templates are required outside the 24-hour
            customer service window.
          </DialogDescription>
        </DialogHeader>
        <TemplateSendForm
          channelId={channelId}
          onCancel={() => onOpenChange(false)}
          onSend={async (templateId, variables) => {
            await onSend(templateId, variables);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function TemplateSendForm({
  channelId,
  onCancel,
  onSend,
}: {
  channelId: string;
  onCancel: () => void;
  onSend: (templateId: string, variables: string[]) => Promise<void>;
}) {
  const [templates, setTemplates] = useState<readonly WhatsAppTemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listWhatsAppTemplates({ channelId, status: 'APPROVED' }, controller.signal)
      .then((response) => setTemplates(response.templates))
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(describeWhatsAppError(failure, 'Could not load templates.'));
      });
    return () => controller.abort();
  }, [channelId]);

  const selected = useMemo(
    () => templates?.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const choose = (template: WhatsAppTemplateSummary) => {
    setSelectedId(template.id);
    setValues(template.parameters.map(() => ''));
  };

  const complete = selected !== null && values.every((value) => value.trim().length > 0);

  const send = async () => {
    if (!selected || !complete) return;
    setSending(true);
    setError(null);
    try {
      await onSend(
        selected.id,
        values.map((value) => value.trim()),
      );
    } catch (failure) {
      setError(describeWhatsAppError(failure));
      setSending(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="grid max-h-80 content-start gap-1 overflow-y-auto pr-1">
          {templates === null && !error ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : null}
          {templates?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No approved templates for this channel. Sync templates from the Channels page.
            </p>
          ) : null}
          {templates?.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={!template.sendable}
              onClick={() => choose(template)}
              className={cn(
                'grid gap-0.5 rounded-md border px-2.5 py-2 text-left text-sm transition-colors',
                selectedId === template.id
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'hover:bg-neutral-50',
                !template.sendable && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="truncate font-medium">{template.name}</span>
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                {template.language} · {template.category.toLowerCase()}
                {!template.sendable ? <Badge variant="outline">media</Badge> : null}
              </span>
            </button>
          ))}
        </div>
        <div className="grid content-start gap-3">
          {selected ? (
            <>
              {selected.parameters.map((parameter, index) => (
                <div
                  key={`${parameter.component}-${parameter.index}-${index}`}
                  className="grid gap-1"
                >
                  <Label htmlFor={`tpl-var-${index}`}>
                    {parameter.component.toLowerCase()} {`{{${parameter.name}}}`}
                  </Label>
                  <Input
                    id={`tpl-var-${index}`}
                    value={values[index] ?? ''}
                    onChange={(event) =>
                      setValues((current) =>
                        current.map((value, i) => (i === index ? event.target.value : value)),
                      )
                    }
                  />
                </div>
              ))}
              <TemplatePreview template={selected} values={values} />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Choose a template to preview it.</p>
          )}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!complete || sending} onClick={() => void send()}>
          {sending ? 'Sending…' : 'Send template'}
        </Button>
      </DialogFooter>
    </>
  );
}
