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
import { CRM_PIPELINE_STATUS_ACTION_CLASS } from '@/features/admin/crm/constants';
import type { EmployeeListItem } from '../types';

export function EmployeeStatusDialog({
  employee,
  pending,
  onClose,
  onConfirm,
}: {
  employee: EmployeeListItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const deactivate = employee?.employmentStatus === 'ACTIVE';

  return (
    <AlertDialog
      open={employee !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivate ? 'Deactivate employee?' : 'Activate employee?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {employee
              ? deactivate
                ? `“${employee.displayName}” will be marked inactive. A linked sign-in account loses access.`
                : `“${employee.displayName}” will be marked active. A linked sign-in account stays able to sign in.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!employee || pending}
            className={deactivate ? CRM_PIPELINE_STATUS_ACTION_CLASS : undefined}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {deactivate ? 'Deactivating…' : 'Activating…'}
              </>
            ) : deactivate ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
