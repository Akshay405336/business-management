'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PROJECT_PLAN_LOCKED_MESSAGE } from '../constants/plan-lock';

export function ProjectPlanLockNotice({
  message = PROJECT_PLAN_LOCKED_MESSAGE,
  className,
  compact,
}: {
  message?: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className={cn(
          'text-muted-foreground inline-flex items-center gap-1 text-xs',
          className,
        )}
        title={message}
      >
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="max-w-[12rem] truncate">{message}</span>
      </span>
    );
  }

  return (
    <p
      className={cn(
        'text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs',
        className,
      )}
      role="status"
    >
      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
