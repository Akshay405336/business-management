'use client';

import type { WhatsAppTemplateSummary } from '@techwin/contracts';
import {
  ImageIcon,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { TEMPLATE_STATUS_CLASS } from '../utils/whatsapp-format';

const WA_GREEN = '#25D366';

function categoryMeta(category: string): {
  label: string;
  Icon: typeof Wrench;
} {
  const key = category.toUpperCase();
  if (key === 'MARKETING') return { label: 'Marketing', Icon: Megaphone };
  if (key === 'AUTHENTICATION') return { label: 'Authentication', Icon: ShieldCheck };
  return { label: 'Utility', Icon: Wrench };
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function highlightTemplateVariables(text: string, className?: string) {
  const parts = text.split(/(\{\{\s*[A-Za-z0-9_]+\s*\}\})/g);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        /\{\{/.test(part) ? (
          <span
            key={index}
            className="mx-0.5 inline rounded bg-emerald-50 px-1 py-px text-[11px] font-semibold text-emerald-700"
          >
            {part.replace(/\s+/g, '')}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

function TemplatePreviewBlock({ template }: { template: WhatsAppTemplateSummary }) {
  const hasMediaHeader = !template.sendable && Boolean(template.headerText);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/90 p-2.5">
      {hasMediaHeader ? (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
          Media header template
        </div>
      ) : template.headerText ? (
        <p className="mb-1.5 line-clamp-1 text-xs font-semibold text-slate-800">
          {highlightTemplateVariables(template.headerText)}
        </p>
      ) : null}
      <p className="line-clamp-4 text-sm leading-snug text-slate-700">
        {highlightTemplateVariables(template.bodyText)}
      </p>
      {template.footerText ? (
        <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-500">{template.footerText}</p>
      ) : null}
      {template.buttons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-200/80 pt-2">
          {template.buttons.slice(0, 3).map((button, index) => (
            <span
              key={index}
              className="rounded-md border border-sky-100 bg-white px-2 py-0.5 text-[10px] font-medium text-sky-700"
            >
              {button.text}
            </span>
          ))}
          {template.buttons.length > 3 ? (
            <span className="text-[10px] text-slate-400">+{template.buttons.length - 3}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function WhatsAppTemplateCard({
  template,
  onView,
}: {
  template: WhatsAppTemplateSummary;
  onView: () => void;
}) {
  const { label: categoryLabel, Icon: CategoryIcon } = categoryMeta(template.category);
  const approved = template.status === 'APPROVED';

  return (
    <article
      className={cn(
        'group flex min-w-0 flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-shadow hover:shadow-md',
        approved && 'border-l-[3px] border-l-[#25D366]',
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <CategoryIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate text-xs font-medium text-slate-600">{categoryLabel}</span>
        </div>
        <Badge
          variant="outline"
          className={cn('shrink-0 text-[10px] capitalize', TEMPLATE_STATUS_CLASS[template.status] ?? '')}
        >
          {formatStatus(template.status)}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8 shrink-0 text-slate-500"
              aria-label="Template actions"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem onSelect={onView}>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button type="button" className="min-w-0 flex-1 text-left" onClick={onView}>
        <h3 className="truncate text-base font-semibold text-slate-900">{template.name}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{template.language}</p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-600">
          <MessageCircle className="size-3.5 shrink-0" style={{ color: WA_GREEN }} aria-hidden="true" />
          <span className="truncate">{template.channelName}</span>
        </p>
        <div className="mt-3">
          <TemplatePreviewBlock template={template} />
        </div>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        <span>
          {template.parameters.length} variable{template.parameters.length === 1 ? '' : 's'}
        </span>
        {template.buttons.length > 0 ? <span>{template.buttons.length} button(s)</span> : null}
        {!template.sendable ? <span className="text-amber-700">Limited preview</span> : null}
      </div>
    </article>
  );
}

export function WhatsAppTemplateListRow({
  template,
  onView,
}: {
  template: WhatsAppTemplateSummary;
  onView: () => void;
}) {
  const { label: categoryLabel, Icon: CategoryIcon } = categoryMeta(template.category);
  const approved = template.status === 'APPROVED';

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs sm:flex-row sm:items-start',
        approved && 'border-l-[3px] border-l-[#25D366]',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[14rem]">
        <div className="flex items-center gap-2">
          <CategoryIcon className="size-4 text-slate-500" aria-hidden="true" />
          <span className="text-xs font-medium text-slate-600">{categoryLabel}</span>
          <Badge
            variant="outline"
            className={cn('ml-auto text-[10px] sm:ml-0', TEMPLATE_STATUS_CLASS[template.status] ?? '')}
          >
            {formatStatus(template.status)}
          </Badge>
        </div>
        <button type="button" className="text-left" onClick={onView}>
          <h3 className="font-semibold text-slate-900">{template.name}</h3>
          <p className="text-xs text-slate-500">
            {template.language} · {template.channelName}
          </p>
        </button>
      </div>
      <div className="min-w-0 flex-[2]">
        <TemplatePreviewBlock template={template} />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <span className="text-[11px] text-slate-500">{template.parameters.length} vars</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Template actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onView}>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
