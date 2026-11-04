'use client';

import type { DailyTaskAssigneeSummary, MySessionEmployeeSummary } from '@techwin/contracts';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmployeeAvatar } from '@/features/admin/employees/components/employee-avatar';
import { useSessionEmployee } from '@/features/auth/hooks/use-session-employee';
import { cn } from '@/shared/lib/utils';

const MAX_VISIBLE = 3;

function dedupeAssignees(
  assignees: readonly DailyTaskAssigneeSummary[],
): DailyTaskAssigneeSummary[] {
  const seen = new Set<string>();
  const out: DailyTaskAssigneeSummary[] = [];
  for (const assignee of assignees) {
    const key = assignee.employeeId || assignee.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(assignee);
  }
  return out;
}

function sessionEmployeeToAssignee(session: MySessionEmployeeSummary): DailyTaskAssigneeSummary {
  return {
    id: session.id,
    employeeId: session.id,
    displayName: session.displayName,
    jobTitle: session.jobTitle,
    profileImageUrl: session.profileImageUrl,
    startedAt: null,
    completedAt: null,
  };
}

function resolveSelfAssigneeForTask(
  assignees: readonly DailyTaskAssigneeSummary[],
  sessionEmployee: MySessionEmployeeSummary | null,
): DailyTaskAssigneeSummary | null {
  if (!sessionEmployee) return null;
  const match = assignees.find((assignee) => assignee.employeeId === sessionEmployee.id);
  return match ?? sessionEmployeeToAssignee(sessionEmployee);
}

function AssigneeTooltipList({ assignees }: { assignees: readonly DailyTaskAssigneeSummary[] }) {
  return (
    <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain py-0.5">
      {assignees.map((assignee) => {
        const designation = assignee.jobTitle?.trim();
        return (
          <li key={assignee.employeeId || assignee.id} className="flex min-w-0 items-center gap-2.5">
            <EmployeeAvatar
              displayName={assignee.displayName}
              profileImageUrl={assignee.profileImageUrl}
              className="size-8 shrink-0 ring-1 ring-black/5"
              lazyLoad={false}
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold leading-tight">{assignee.displayName}</p>
              {designation ? (
                <p className="text-muted-foreground truncate text-[11px] leading-snug">{designation}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AssigneeAvatarTrigger({
  assigneesForTooltip,
  tooltipTitle,
  tooltipHeading,
  avatarStack,
  className,
}: {
  assigneesForTooltip: readonly DailyTaskAssigneeSummary[];
  tooltipTitle: string;
  tooltipHeading: string;
  avatarStack: ReactNode;
  className?: string;
}) {
  const [touchOpen, setTouchOpen] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarsePointer(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip
        open={coarsePointer ? touchOpen : undefined}
        onOpenChange={coarsePointer ? setTouchOpen : undefined}
      >
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex max-w-full shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              className,
            )}
            aria-label={tooltipTitle}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (coarsePointer) {
                setTouchOpen((open) => !open);
              }
            }}
          >
            {avatarStack}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="bg-card text-foreground border-border max-w-[15rem] border p-2.5 shadow-lg"
          onPointerDownOutside={() => setTouchOpen(false)}
        >
          <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase tracking-wide">
            {tooltipHeading}
          </p>
          <AssigneeTooltipList assignees={assigneesForTooltip} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DailyTaskAssigneeAvatarGroup({
  assignees,
  className,
  emptyFallback,
  employeeSelfView = false,
}: {
  assignees: readonly DailyTaskAssigneeSummary[];
  className?: string;
  /** Shown when there are no assignees (e.g. kanban dash placeholder). */
  emptyFallback?: ReactNode;
  /** Employee portal: show only the signed-in employee (session-linked). */
  employeeSelfView?: boolean;
}) {
  const sessionEmployee = useSessionEmployee();

  const unique = useMemo(() => dedupeAssignees(assignees), [assignees]);
  const selfAssignee = useMemo(
    () => (employeeSelfView ? resolveSelfAssigneeForTask(unique, sessionEmployee) : null),
    [employeeSelfView, sessionEmployee, unique],
  );

  const displayAssignees = employeeSelfView
    ? selfAssignee
      ? [selfAssignee]
      : []
    : unique;

  const total = displayAssignees.length;
  const visible = employeeSelfView ? displayAssignees : unique.slice(0, MAX_VISIBLE);
  const extra =
    !employeeSelfView && unique.length > MAX_VISIBLE ? unique.length - MAX_VISIBLE : 0;

  if (total === 0) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  const assigneeNames = displayAssignees.map((a) => a.displayName).join(', ');
  const tooltipTitle = employeeSelfView
    ? `You: ${assigneeNames}`
    : total === 1
      ? `Assigned: ${assigneeNames}`
      : `${unique.length} assignees`;
  const tooltipHeading = employeeSelfView ? 'You' : `Assignees (${unique.length})`;

  const avatarStack = (
    <span className="inline-flex items-center transition-opacity duration-150 hover:opacity-90">
      {visible.map((assignee, index) => (
        <span
          key={assignee.employeeId || assignee.id}
          className={cn('relative inline-flex shrink-0', index > 0 && '-ml-2.5')}
          style={{ zIndex: visible.length - index + (extra > 0 ? 1 : 0) }}
        >
          <EmployeeAvatar
            displayName={assignee.displayName}
            profileImageUrl={assignee.profileImageUrl}
            className="size-9 ring-2 ring-card"
          />
        </span>
      ))}
      {extra > 0 ? (
        <span
          className="bg-muted text-muted-foreground ring-card relative -ml-2.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-2"
          style={{ zIndex: 0 }}
          aria-hidden
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );

  return (
    <AssigneeAvatarTrigger
      assigneesForTooltip={displayAssignees}
      tooltipTitle={tooltipTitle}
      tooltipHeading={tooltipHeading}
      avatarStack={avatarStack}
      className={className}
    />
  );
}
