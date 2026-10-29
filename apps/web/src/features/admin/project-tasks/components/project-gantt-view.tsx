'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatProjectDateOnly } from '../utils/format-project-date';
import { ProjectPriorityBadge } from '@/features/admin/projects/components/project-priority-badge';
import { ProjectProgressBar } from '@/features/admin/projects/components/project-progress-bar';
import { ProjectStatusBadge } from '@/features/admin/projects/components/project-status-badge';
import { labelProjectPhaseStatus } from '@/features/admin/projects/utils/labels';
import { mixStageColorWithWhite } from '@/features/admin/crm/utils/stage-color';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem, ProjectTaskSummaryPhaseItem } from '../types';
import { projectPhaseAccentHex } from '../utils/phase-accent-color';
import {
  addCalendarDays,
  buildTimelineTicks,
  collectTimelineBounds,
  defaultDaySpan,
  isValidDateOnly,
  navigationStepDays,
  placementForRange,
  pxPerDayForZoom,
  todayOffsetPx,
  type GanttZoom,
} from '../utils/gantt-date-math';
import { calendarDaysBetween, localDateOnlyIso } from '../utils/project-timeline-indicator';

const LEFT_PANEL_WIDTH = 280;
const PROJECT_ROW_H = 52;
const PHASE_ROW_H = 40;

type GanttRow =
  | { kind: 'project'; project: ProjectTaskSummaryItem; height: number }
  | {
      kind: 'phase';
      project: ProjectTaskSummaryItem;
      phase: ProjectTaskSummaryPhaseItem;
      height: number;
    };

function GanttToolbar({
  zoom,
  onZoomChange,
  onToday,
  onPrev,
  onNext,
  onFitAll,
}: {
  zoom: GanttZoom;
  onZoomChange: (zoom: GanttZoom) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFitAll: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b px-2 py-2">
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={onToday}>
        Today
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={onPrev}>
        Previous
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={onNext}>
        Next
      </Button>
      <Select value={zoom} onValueChange={(v) => onZoomChange(v as GanttZoom)}>
        <SelectTrigger className="h-8 w-[7.5rem]" aria-label="Timeline zoom">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Day</SelectItem>
          <SelectItem value="week">Week</SelectItem>
          <SelectItem value="month">Month</SelectItem>
        </SelectContent>
      </Select>
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={onFitAll}>
        Fit all projects
      </Button>
    </div>
  );
}

function TimelineBar({
  placement,
  accent,
  label,
  tooltip,
  progressPercent,
  heightClass,
  onClick,
}: {
  placement: { leftPx: number; widthPx: number };
  accent: string;
  label: string;
  tooltip: string;
  progressPercent?: number;
  heightClass: string;
  onClick?: () => void;
}) {
  const bg = mixStageColorWithWhite(accent, 0.12);
  const progress = Math.min(100, Math.max(0, progressPercent ?? 0));
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-md border text-left shadow-xs transition-opacity hover:opacity-95',
        heightClass,
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
      style={{
        left: placement.leftPx,
        width: placement.widthPx,
        borderColor: mixStageColorWithWhite(accent, 0.35),
        backgroundColor: bg,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 opacity-35"
        style={{ width: `${progress}%`, backgroundColor: accent }}
        aria-hidden="true"
      />
      <span className="relative z-[1] block truncate px-1.5 text-[10px] font-medium leading-none">
        {label}
      </span>
    </button>
  );
}

function SideProjectRow({
  project,
  expanded,
  onToggle,
  rowHeight,
}: {
  project: ProjectTaskSummaryItem;
  expanded: boolean;
  onToggle: () => void;
  rowHeight: number;
}) {
  const datesMissing =
    !isValidDateOnly(project.startDate) || !isValidDateOnly(project.expectedEndDate);

  return (
    <div
      className="border-border/60 flex min-w-0 flex-col justify-center gap-0.5 border-b px-2.5 py-1"
      style={{ height: rowHeight, width: LEFT_PANEL_WIDTH }}
    >
      <div className="flex min-w-0 items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse phases' : 'Expand phases'}
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden="true" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/project-tasks/${project.id}`}
            className="text-foreground hover:text-primary block truncate text-sm font-medium leading-tight"
          >
            {project.name}
          </Link>
          <p className="text-muted-foreground truncate text-[10px] tabular-nums">{project.projectNumber}</p>
        </div>
      </div>
      <p className="text-muted-foreground truncate pl-7 text-[10px]">{project.clientName}</p>
      <div className="flex flex-wrap items-center gap-1 pl-7">
        <ProjectStatusBadge status={project.status} />
        <ProjectPriorityBadge priority={project.priority} />
        <span className="text-muted-foreground text-[10px] tabular-nums">
          {project.phaseCount} phases
        </span>
      </div>
      <div className="min-w-0 pl-7 pr-1">
        <ProjectProgressBar percent={project.progressPercent} className="scale-90 origin-left" />
      </div>
      {datesMissing ? (
        <p className="text-muted-foreground pl-7 text-[10px] italic">Dates not set</p>
      ) : null}
    </div>
  );
}

function SidePhaseRow({ phase, rowHeight }: { phase: ProjectTaskSummaryPhaseItem; rowHeight: number }) {
  const datesMissing =
    !isValidDateOnly(phase.startDate) || !isValidDateOnly(phase.expectedEndDate);
  return (
    <div
      className="bg-muted/20 border-border/40 flex min-w-0 items-center border-b pl-9 pr-2"
      style={{ height: rowHeight, width: LEFT_PANEL_WIDTH }}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{phase.name}</p>
        {datesMissing ? (
          <p className="text-muted-foreground text-[10px] italic">Dates not set</p>
        ) : (
          <p className="text-muted-foreground text-[10px] tabular-nums">
            {labelProjectPhaseStatus(phase.status)} · {phase.progressPercent}%
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjectGanttView({
  items,
  className,
}: {
  items: readonly ProjectTaskSummaryItem[];
  className?: string;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState<GanttZoom>('week');
  const [rangeStart, setRangeStart] = useState(() =>
    addCalendarDays(localDateOnlyIso(), -14),
  );
  const [daySpan, setDaySpan] = useState(() => defaultDaySpan('week'));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const pxPerDay = pxPerDayForZoom(zoom);
  const timelineWidth = daySpan * pxPerDay;

  const ticks = useMemo(
    () => buildTimelineTicks(rangeStart, daySpan, zoom),
    [rangeStart, daySpan, zoom],
  );

  const todayPx = useMemo(
    () => todayOffsetPx(rangeStart, pxPerDay, daySpan),
    [rangeStart, pxPerDay, daySpan],
  );

  const handleZoomChange = useCallback((next: GanttZoom) => {
    setZoom(next);
    setDaySpan(defaultDaySpan(next));
  }, []);

  const goToday = useCallback(() => {
    const span = daySpan;
    setRangeStart(addCalendarDays(localDateOnlyIso(), -Math.floor(span / 2)));
  }, [daySpan]);

  const goPrev = useCallback(() => {
    setRangeStart((current) =>
      addCalendarDays(current, -navigationStepDays(zoom, daySpan)),
    );
  }, [zoom, daySpan]);

  const goNext = useCallback(() => {
    setRangeStart((current) => addCalendarDays(current, navigationStepDays(zoom, daySpan)));
  }, [zoom, daySpan]);

  const fitAll = useCallback(() => {
    const bounds = collectTimelineBounds(items);
    if (!bounds) {
      goToday();
      return;
    }
    const paddedStart = addCalendarDays(bounds.min, -7);
    const paddedEnd = addCalendarDays(bounds.max, 7);
    const span = Math.max(14, calendarDaysBetween(paddedStart, paddedEnd) + 1);
    setRangeStart(paddedStart);
    setDaySpan(span);
  }, [items, goToday]);

  const rows = useMemo((): GanttRow[] => {
    const result: GanttRow[] = [];
    for (const project of items) {
      result.push({ kind: 'project', project, height: PROJECT_ROW_H });
      const isCollapsed = collapsed[project.id] ?? false;
      if (!isCollapsed) {
        for (const phase of project.phases) {
          result.push({ kind: 'phase', project, phase, height: PHASE_ROW_H });
        }
      }
    }
    return result;
  }, [items, collapsed]);

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        No projects to display on the timeline.
      </div>
    );
  }

  return (
    <div className={cn('bg-card min-w-0 overflow-hidden rounded-lg border shadow-xs', className)}>
      <GanttToolbar
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onToday={goToday}
        onPrev={goPrev}
        onNext={goNext}
        onFitAll={fitAll}
      />
      <div className="flex min-w-0 max-w-full">
        <div className="bg-card shrink-0 border-r">
          <div
            className="border-border/60 bg-muted/30 text-muted-foreground flex items-end border-b px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide"
            style={{ height: 36, width: LEFT_PANEL_WIDTH }}
          >
            Projects & phases
          </div>
          {rows.map((row) =>
            row.kind === 'project' ? (
              <SideProjectRow
                key={`p-${row.project.id}`}
                project={row.project}
                expanded={!(collapsed[row.project.id] ?? false)}
                onToggle={() =>
                  setCollapsed((c) => ({
                    ...c,
                    [row.project.id]: !(c[row.project.id] ?? false),
                  }))
                }
                rowHeight={row.height}
              />
            ) : (
              <SidePhaseRow key={`ph-${row.phase.id}`} phase={row.phase} rowHeight={row.height} />
            ),
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth, minWidth: '100%' }}>
            <div
              className="border-border/60 bg-muted/30 relative border-b"
              style={{ height: 36 }}
            >
              {ticks.map((tick) => {
                const offset = calendarDaysBetween(rangeStart, tick.iso);
                if (offset < 0 || offset >= daySpan) return null;
                return (
                  <div
                    key={tick.iso}
                    className="absolute top-0 flex h-full flex-col justify-end pb-1"
                    style={{ left: offset * pxPerDay }}
                  >
                    <span
                      className={cn(
                        'text-muted-foreground pr-2 text-[10px] tabular-nums whitespace-nowrap',
                        tick.major && 'text-foreground font-medium',
                      )}
                    >
                      {tick.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {rows.map((row) => (
              <div
                key={row.kind === 'project' ? `tp-${row.project.id}` : `tph-${row.phase.id}`}
                className="border-border/40 relative border-b"
                style={{ height: row.height }}
              >
                {ticks
                  .filter((t) => t.major)
                  .map((tick) => {
                    const offset = calendarDaysBetween(rangeStart, tick.iso);
                    if (offset < 0 || offset > daySpan) return null;
                    return (
                      <div
                        key={`grid-${tick.iso}-${row.project.id}`}
                        className="bg-border/40 pointer-events-none absolute top-0 bottom-0 w-px"
                        style={{ left: offset * pxPerDay }}
                        aria-hidden="true"
                      />
                    );
                  })}
                {todayPx !== null ? (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary/70"
                    style={{ left: todayPx }}
                  >
                    <span className="bg-primary text-primary-foreground absolute -top-0 left-1 rounded px-1 text-[9px] font-medium">
                      Today
                    </span>
                  </div>
                ) : null}
                {row.kind === 'project' ? (
                  (() => {
                    const p = row.project;
                    if (!isValidDateOnly(p.startDate) || !isValidDateOnly(p.expectedEndDate)) {
                      return null;
                    }
                    const placement = placementForRange(
                      rangeStart,
                      p.startDate,
                      p.expectedEndDate,
                      pxPerDay,
                    );
                    if (!placement) return null;
                    return (
                      <TimelineBar
                        placement={placement}
                        accent="#334155"
                        label={p.name}
                        progressPercent={p.progressPercent}
                        heightClass="h-7"
                        tooltip={`${p.name}\n${formatProjectDateOnly(p.startDate)} – ${formatProjectDateOnly(p.expectedEndDate)}\nProgress ${p.progressPercent}%\nStatus ${p.status}`}
                        onClick={() => router.push(`/admin/project-tasks/${p.id}`)}
                      />
                    );
                  })()
                ) : (
                  (() => {
                    const phase = row.phase;
                    if (!isValidDateOnly(phase.startDate) || !isValidDateOnly(phase.expectedEndDate)) {
                      return null;
                    }
                    const accent = projectPhaseAccentHex(phase.sortOrder);
                    const placement = placementForRange(
                      rangeStart,
                      phase.startDate,
                      phase.expectedEndDate,
                      pxPerDay,
                    );
                    if (!placement) return null;
                    return (
                      <TimelineBar
                        placement={placement}
                        accent={accent}
                        label={phase.name}
                        progressPercent={phase.progressPercent}
                        heightClass="h-6"
                        tooltip={`${phase.name}\n${formatProjectDateOnly(phase.startDate)} – ${formatProjectDateOnly(phase.expectedEndDate)}\n${labelProjectPhaseStatus(phase.status)}\nProgress ${phase.progressPercent}%`}
                        onClick={() => router.push(`/admin/project-tasks/${row.project.id}`)}
                      />
                    );
                  })()
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
