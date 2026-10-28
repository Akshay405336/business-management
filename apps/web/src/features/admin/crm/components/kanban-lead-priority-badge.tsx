'use client';

import { Flag } from 'lucide-react';
import { useId } from 'react';
import type { LeadPriority } from '../types';
import { labelLeadPriority } from '../utils/labels';
import { cn } from '@/shared/lib/utils';

export type KanbanLeadPriorityTheme = {
  fill: string;
  fillStrong: string;
  strokeAccent: string;
  labelClass: string;
};

/** Tab fill, gradient fade, accent stroke, and label/icon per priority. */
export const kanbanLeadPriorityTheme: Record<LeadPriority, KanbanLeadPriorityTheme> = {
  URGENT: {
    fill: '#fee2e2',
    fillStrong: '#fca5a5',
    strokeAccent: '#dc2626',
    labelClass: 'text-[#b91c1c]',
  },
  HIGH: {
    fill: '#ffedd5',
    fillStrong: '#fdba74',
    strokeAccent: '#f97316',
    labelClass: 'text-[#c2410c]',
  },
  MEDIUM: {
    fill: '#fef9c3',
    fillStrong: '#fde047',
    strokeAccent: '#eab308',
    labelClass: 'text-[#a16207]',
  },
  LOW: {
    fill: '#ccfbf1',
    fillStrong: '#5eead4',
    strokeAccent: '#14b8a6',
    labelClass: 'text-[#0f766e]',
  },
};

/** Curved shoulder; viewBox height 40px (matches header h-10). */
const PRIORITY_TAB_VIEWBOX = '0 0 220 40';

/**
 * Reference-style S-step: flat top → ease down → ease into flat bottom.
 * CP1 on top row, CP2 on bottom row → horizontal tangents at both ends (no sharp cuts).
 */
const PRIORITY_TAB_SHOULDER_CURVE = 'C 208 0 184 40 220 40';

const PRIORITY_TAB_PATH = `M 16 0 H 172 ${PRIORITY_TAB_SHOULDER_CURVE} H 0 V 13 Q 0 0 16 0 Z`;

/** Colored tab ~65% of card; curve starts further right. */
export const KANBAN_PRIORITY_TAB_WIDTH_CLASS = 'w-[min(220px,65%)] min-w-[9rem]';

export const KANBAN_LEAD_CARD_BORDER_COLOR = '#e3e8ef';

/** Card outline: left + bottom only (open top-right for transparent ⋯ pocket). */
export const KANBAN_LEAD_CARD_BORDER_CLASS =
  'border border-[#e3e8ef] border-t-0 border-r-0';

/** Flat top only — shoulder edge comes from fill shape, not a second stroke. */
const PRIORITY_TAB_TOP_ACCENT = 'M 16 0 H 172';

/** Shoulder only (left); no horizontal rule on the transparent ⋯ side. */
const HEADER_STEP_OUTLINE = 'M 50.818 0 C 61.455 0 54.364 40 65 40';

export const KANBAN_LEAD_HEADER_HEIGHT_CLASS = 'h-10';

/** ~65% space above / ~35% below priority row (h-10 minus 0.875rem icon line). */
export const KANBAN_LEAD_PRIORITY_INSET_CLASS =
  'box-border pt-[calc((2.5rem-0.875rem)*0.65)] pb-[calc((2.5rem-0.875rem)*0.35)]';

/** Header step line only (curve edge = tab fill; no duplicate shoulder stroke). */
export function KanbanLeadHeaderStepBorder({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-[1] h-10 w-full overflow-visible',
        className,
      )}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={HEADER_STEP_OUTLINE}
        fill="none"
        stroke={KANBAN_LEAD_CARD_BORDER_COLOR}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function KanbanLeadPriorityTab({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  const theme = kanbanLeadPriorityTheme[priority];
  const fillGradientId = useId();
  const strokeGradientId = useId();

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-0 z-0 h-10',
        KANBAN_PRIORITY_TAB_WIDTH_CLASS,
        className,
      )}
      aria-hidden
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox={PRIORITY_TAB_VIEWBOX}
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.fillStrong} stopOpacity="0.62" />
            <stop offset="10%" stopColor={theme.fill} stopOpacity="0.48" />
            <stop offset="28%" stopColor={theme.fill} stopOpacity="0.18" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={strokeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.strokeAccent} stopOpacity="0.38" />
            <stop offset="55%" stopColor={theme.strokeAccent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={theme.strokeAccent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={PRIORITY_TAB_PATH} fill={`url(#${fillGradientId})`} />
        <path
          d={PRIORITY_TAB_TOP_ACCENT}
          fill="none"
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function KanbanLeadPriorityHeader({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  const theme = kanbanLeadPriorityTheme[priority];
  const label = `${labelLeadPriority(priority).toUpperCase()} PRIORITY`;

  return (
    <div
      className={cn(
        'relative z-[2] flex h-10 shrink-0 items-start gap-1.5 pr-2 pl-3.5',
        KANBAN_LEAD_PRIORITY_INSET_CLASS,
        KANBAN_PRIORITY_TAB_WIDTH_CLASS,
        className,
      )}
    >
      <Flag className={cn('size-3.5 shrink-0', theme.labelClass)} aria-hidden="true" />
      <span
        className={cn(
          'truncate text-[11px] leading-none font-bold tracking-[0.06em] uppercase',
          theme.labelClass,
        )}
      >
        {label}
      </span>
    </div>
  );
}
