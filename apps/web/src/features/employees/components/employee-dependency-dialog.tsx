'use client';

import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { EmployeeDeletionImpact } from '@techwin/contracts';
import { labelDailyTaskStatus } from '../utils/employee-deletion';

export function EmployeeDependencyDialog({
  open,
  impact,
  onClose,
}: {
  open: boolean;
  impact: EmployeeDeletionImpact | null;
  onClose: () => void;
}) {
  const tasks = impact?.tasks ?? [];
  const hiddenCount = Math.max(0, (impact?.pendingTaskCount ?? 0) - tasks.length);
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cannot Delete Employee</AlertDialogTitle>
          <AlertDialogDescription>
            This employee has unfinished Daily Tasks assigned to them. Complete or reassign these
            tasks before deleting this employee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <p className="text-sm font-medium">
            Pending tasks: {impact?.pendingTaskCount ?? tasks.length}
          </p>
          <ul className="mt-3 grid max-h-80 gap-2 overflow-y-auto">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{task.title}</span>
                <Badge variant="secondary" className="shrink-0">
                  {labelDailyTaskStatus(task.status)}
                </Badge>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">And {hiddenCount} more unfinished tasks.</p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
