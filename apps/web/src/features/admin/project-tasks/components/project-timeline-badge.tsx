'use client';

import { cn } from '@/shared/lib/utils';
import type { ProjectTaskSummaryItem } from '../types';
import {
  getProjectTimelineIndicator,
  projectTimelineIndicatorClass,
} from '../utils/project-timeline-indicator';

export function ProjectTimelineBadge({ project }: { project: ProjectTaskSummaryItem }) {
  const indicator = getProjectTimelineIndicator({
    startDate: project.startDate,
    expectedEndDate: project.expectedEndDate,
    status: project.status,
  });

  if (!indicator) return null;

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
        projectTimelineIndicatorClass[indicator.variant],
      )}
    >
      {indicator.label}
    </span>
  );
}
