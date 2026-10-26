'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEmployee } from '../api/employees';
import type { EmployeeDetail } from '../types';
import { labelEmploymentType, labelEmployeeStatus } from '../utils/labels';
import { describeEmployeeError } from '../utils/errors';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { EmployeeStatusBadge } from './employee-status-badge';

type Props = {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function EmployeeDetailDialog({ employeeId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !employeeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear detail when dialog closes
      setDetail(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getEmployee(employeeId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDetail(result);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setError(describeEmployeeError(failure));
        setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, employeeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.displayName ?? 'Employee details'}</DialogTitle>
          <DialogDescription>
            {detail?.employeeCode ? `Code ${detail.employeeCode}` : 'Employment and contact information.'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <CrmErrorAlert message={error} />
        ) : detail ? (
          <dl className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <EmployeeStatusBadge status={detail.employmentStatus} />
              <span className="text-muted-foreground text-sm">{labelEmploymentType(detail.employmentType)}</span>
            </div>
            <DetailRow label="Work email" value={detail.workEmail} />
            <DetailRow label="Phone" value={detail.phone} />
            <DetailRow label="Alternate phone" value={detail.alternatePhone} />
            <DetailRow label="Job title" value={detail.jobTitle} />
            <DetailRow label="Department" value={detail.department} />
            <DetailRow
              label="Reporting manager"
              value={
                detail.reportingManager
                  ? `${detail.reportingManager.displayName} (${detail.reportingManager.employeeCode})`
                  : null
              }
            />
            <DetailRow label="Date joined" value={detail.dateOfJoining} />
            <DetailRow label="Probation ends" value={detail.probationEndDate} />
            <DetailRow label="Employment ends" value={detail.employmentEndDate} />
            <DetailRow label="Work location" value={detail.workLocation} />
            <DetailRow label="Status" value={labelEmployeeStatus(detail.employmentStatus)} />
            {detail.notes.trim() ? (
              <div className="grid gap-1">
                <dt className="text-muted-foreground text-sm">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{detail.notes}</dd>
              </div>
            ) : null}
            <DetailRow label="Created" value={new Date(detail.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(detail.updatedAt).toLocaleString()} />
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
