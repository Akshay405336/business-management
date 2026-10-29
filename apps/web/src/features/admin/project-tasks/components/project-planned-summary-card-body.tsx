'use client';

import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Pencil,
  Play,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatProjectDateOnly } from '../utils/format-project-date';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';
import type { ProjectCardTimelineIndicator } from '../utils/project-timeline-indicator';
import { projectCardTimelineToneClass } from '../utils/project-timeline-indicator';

export function ProjectPlannedSummaryCardBody({
  project,
  clientName,
  clientAvatarStyle,
  timelineIndicator,
  planHref,
  actionsDisabled,
  pending,
  onStartProduction,
}: {
  project: ProjectTaskSummaryItem;
  clientName: string;
  clientAvatarStyle: { backgroundColor: string; color: string };
  timelineIndicator: ProjectCardTimelineIndicator | null;
  planHref: string;
  actionsDisabled?: boolean;
  pending?: boolean;
  onStartProduction: () => void;
}) {
  const ownerInitials = initialsOf(clientName === '—' ? project.name : clientName);
  const bannerLabel = timelineIndicator?.label ?? 'Plan ready';
  const bannerTone = timelineIndicator?.tone ?? 'upcoming';
  const bannerIsDelayed = bannerTone === 'delayed';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={clientAvatarStyle}
          >
            {ownerInitials}
          </span>
          <div className="min-w-0">
            <p className="text-foreground truncate text-[13px] font-semibold">{clientName}</p>
            <p className="text-muted-foreground text-[10px] leading-snug">Project Owner</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 bg-white py-1.5 pr-2.5 pl-3 text-[11px] font-semibold text-neutral-900">
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                bannerIsDelayed ? 'bg-red-500' : 'bg-emerald-500',
              )}
              aria-hidden="true"
            />
            Planned
            <ChevronDown className="size-3.5 opacity-50" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="border-border/70 grid grid-cols-3 divide-x border-y py-3">
        <div className="flex flex-col items-center gap-1 px-1 text-center">
          <p className="text-foreground text-lg leading-none font-bold tabular-nums">
            {project.phaseCount}
          </p>
          <p className="text-muted-foreground text-[10px] font-medium">Phases</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-1 text-center">
          <p className="text-foreground text-lg leading-none font-bold tabular-nums">
            {project.taskCount}
          </p>
          <p className="text-muted-foreground text-[10px] font-medium">Tasks</p>
        </div>
        <div className="flex flex-col items-center gap-1.5 px-1 text-center">
          <div className="flex items-center justify-center -space-x-2">
            <span
              className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold"
              style={clientAvatarStyle}
            >
              {ownerInitials}
            </span>
            <span className="bg-muted flex size-7 items-center justify-center rounded-full border-2 border-white">
              <User className="text-muted-foreground size-3.5" aria-hidden="true" />
            </span>
            <span className="bg-muted flex size-7 items-center justify-center rounded-full border-2 border-white">
              <User className="text-muted-foreground size-3.5" aria-hidden="true" />
            </span>
          </div>
          <p className="text-muted-foreground text-[10px] font-medium">1 Member</p>
        </div>
      </div>

      <div className="min-w-0 px-0.5 py-0.5">
        <p className="text-muted-foreground mb-1 text-[10px] leading-snug">Timeline</p>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <p className="text-foreground truncate whitespace-nowrap text-xs font-semibold tabular-nums">
              {formatProjectDateOnly(project.startDate)} – {formatProjectDateOnly(project.expectedEndDate)}
            </p>
          </div>
          <p
            className={cn(
              'shrink-0 whitespace-nowrap text-[11px] leading-snug font-semibold',
              timelineIndicator
                ? projectCardTimelineToneClass[bannerTone]
                : bannerIsDelayed
                  ? 'text-amber-800'
                  : 'text-emerald-700',
            )}
          >
            {bannerLabel}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button
          asChild
          className="h-11 w-full rounded-xl border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-4 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
        >
          <Link href={planHref} className="flex w-full items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <Pencil className="size-4" aria-hidden="true" />
              Edit Plan
            </span>
            <ArrowRight className="size-4 opacity-90" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl bg-white"
          disabled={actionsDisabled || pending}
          onClick={onStartProduction}
        >
          <Play className="size-3.5" aria-hidden="true" />
          Start Production
        </Button>
      </div>
    </div>
  );
}
