'use client';

import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS } from '@/features/admin/crm/constants';

export function EmployeeDeleteDialog({
  open,
  employeeName,
  completedTaskCount,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  employeeName: string;
  completedTaskCount: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const preservesHistory = completedTaskCount > 0;
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
          <AlertDialogDescription>
            {preservesHistory
              ? 'All assigned Daily Tasks are completed. Deleting this employee will preserve their completed task history.'
              : `Delete ${employeeName}? This permanently removes the employee record and any login account created with it.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              'Delete Employee'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
