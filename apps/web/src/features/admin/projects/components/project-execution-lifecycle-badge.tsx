'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { ProjectExecutionLifecycle } from '../types';
import { labelProjectExecutionLifecycle } from '../utils/labels';

const variantClass: Record<ProjectExecutionLifecycle, string> = {
  NOT_PLANNED: 'border-slate-200 bg-slate-50 text-slate-800',
  PLANNED: 'border-sky-200 bg-sky-50 text-sky-900',
  IN_PRODUCTION: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  COMPLETED: 'border-violet-200 bg-violet-50 text-violet-900',
};

export function ProjectExecutionLifecycleBadge({
  lifecycle,
  className,
}: {
  lifecycle: ProjectExecutionLifecycle;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 font-medium uppercase tracking-wide', variantClass[lifecycle], className)}
    >
      {labelProjectExecutionLifecycle(lifecycle)}
    </Badge>
  );
}
