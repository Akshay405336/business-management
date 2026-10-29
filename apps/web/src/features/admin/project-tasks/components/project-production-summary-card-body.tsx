'use client';

import { ArrowRight, Calendar, CheckCircle2, ChevronDown, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { formatProjectDateTime } from '../utils/format-project-date';
import { initialsOf } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';
import {
  describeProductionStartVsPlan,
  projectProductionStartVarianceClass,
} from '../utils/project-timeline-indicator';

export function ProjectProductionSummaryCardBody({
  project,
  clientName,
  clientAvatarStyle,
  boardHref,
  actionsDisabled,
  pending,
  onComplete,
}: {
  project: ProjectTaskSummaryItem;
  clientName: string;
  clientAvatarStyle: { backgroundColor: string; color: string };
  boardHref: string;
  actionsDisabled?: boolean;
  pending?: boolean;
  onComplete: () => void;
}) {
  const ownerInitials = initialsOf(clientName === '—' ? project.name : clientName);
  const productionStartedAt = project.actualProductionStartedAt;
  const startVarianceLabel = describeProductionStartVsPlan(
    project.startDate,
    productionStartedAt,
  );

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
            <span className="size-2.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
            Production
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
        <p className="text-muted-foreground mb-1 text-[10px] leading-snug">Production started</p>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <p className="text-foreground truncate whitespace-nowrap text-xs font-semibold tabular-nums">
              {productionStartedAt
                ? formatProjectDateTime(productionStartedAt).replace(', ', ' ')
                : '—'}
            </p>
          </div>
          {startVarianceLabel ? (
            <p
              className={cn(
                'shrink-0 whitespace-nowrap text-[11px] leading-snug font-semibold tabular-nums',
                projectProductionStartVarianceClass,
              )}
            >
              {startVarianceLabel}
            </p>
          ) : null}
        </div>
        <ProjectProgressBar percent={project.progressPercent} className="mt-2.5 w-full" />
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button
          asChild
          className="h-11 w-full rounded-xl border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-4 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
        >
          <Link href={boardHref} className="flex w-full items-center justify-between gap-2">
            <span>Open Production Board</span>
            <ArrowRight className="size-4 opacity-90" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl bg-white"
          disabled={actionsDisabled || pending}
          onClick={onComplete}
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Complete
        </Button>
      </div>
    </div>
  );
}
