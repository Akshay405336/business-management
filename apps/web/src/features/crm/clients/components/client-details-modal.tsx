'use client';

import { Loader2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import {
  CrmErrorAlert,
  CrmFieldLabel,
  CrmLoadingRows,
} from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { labelClientType } from '@/features/admin/crm/utils/labels';
import {
  LEAD_FORM_PRIMARY_BTN,
  LEAD_FORM_SECONDARY_BTN,
} from '@/features/crm/leads/components/lead-form-dialog';
import { cn } from '@/shared/lib/utils';
import { useChangeClientStatus, useClient } from '../hooks';
import { ClientStatusBadge } from './client-status-badge';
import {
  CLIENT_DETAILS_DIALOG_CLASS,
  CLIENT_DIALOG_FOOTER_CLASS,
  CLIENT_DIALOG_HEADER_CLASS,
  CLIENT_FORM_DIALOG_SCROLL_CLASS,
  CLIENT_MODAL_DIALOG_STYLE,
} from './client-dialog-shell';

function DetailValue({ children, multiline }: { children: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div
        className={cn(
          CRM_PIPELINE_FORM_TEXTAREA_CLASS,
          'text-foreground min-h-[3.5rem] w-full min-w-0 px-3 py-2 text-sm break-words whitespace-pre-wrap',
        )}
      >
        {children.trim() ? children : '—'}
      </div>
    );
  }
  return (
    <div
      className={cn(
        CRM_PIPELINE_FORM_FIELD_CLASS,
        'text-foreground flex min-h-11 w-full min-w-0 items-center px-3 text-sm',
      )}
    >
      <span className="min-w-0 break-words">{children.trim() ? children : '—'}</span>
    </div>
  );
}

function DetailField({
  label,
  value,
  multiline,
  className,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <CrmFieldLabel>{label}</CrmFieldLabel>
      <DetailValue multiline={multiline}>{value}</DetailValue>
    </div>
  );
}

export function ClientDetailsModal({
  clientId,
  open,
  onOpenChange,
  onEdit,
  onUpdated,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (clientId: string) => void;
  onUpdated?: () => void;
}) {
  const toast = useAdminToast();
  const { client, loading, error, refetch } = useClient(clientId, open);
  const { changeClientStatus, pending: statusPending } = useChangeClientStatus();
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setStatusConfirmOpen(false);
  }, [open]);

  const confirmStatusChange = async () => {
    if (!client) return;
    const next = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusConfirmOpen(false);
    try {
      await changeClientStatus(client.id, next);
      toast.success(next === 'ACTIVE' ? 'Client activated.' : 'Client deactivated.');
      refetch();
      onUpdated?.();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const statusChangeIsDeactivate = client?.status === 'ACTIVE';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={CLIENT_DETAILS_DIALOG_CLASS}
          style={CLIENT_MODAL_DIALOG_STYLE}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className={CLIENT_DIALOG_HEADER_CLASS}>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
              <span className="min-w-0 truncate">{client?.name ?? 'Client details'}</span>
              {client ? <ClientStatusBadge status={client.status} /> : null}
              {client?.archivedAt ? (
                <Badge variant="outline" className="shrink-0">
                  Archived
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className={CLIENT_FORM_DIALOG_SCROLL_CLASS}>
            {loading && !client ? <CrmLoadingRows rows={6} /> : null}
            {error && !client ? <CrmErrorAlert message={error} /> : null}
            {client ? (
              <div className="grid gap-6 pb-2">
                <section className="grid gap-4 sm:grid-cols-2">
                  <h3 className="text-foreground col-span-full text-sm font-semibold">Client overview</h3>
                  <DetailField label="Client code" value={client.referenceNumber} />
                  <DetailField label="Client type" value={labelClientType(client.type)} />
                  <DetailField label="Display name" value={client.name} />
                  <DetailField label="Contact person" value={client.primaryContact} />
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <h3 className="text-foreground col-span-full text-sm font-semibold">
                    Contact information
                  </h3>
                  <DetailField label="Email" value={client.email ?? ''} />
                  <DetailField label="Phone" value={client.phone ?? ''} />
                  <DetailField label="Website" value={client.website ?? ''} className="sm:col-span-2" />
                </section>

                <section className="grid gap-4">
                  <h3 className="text-foreground text-sm font-semibold">Address</h3>
                  <DetailField label="Billing address" value={client.billingAddress} multiline />
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <h3 className="text-foreground col-span-full text-sm font-semibold">
                    Business information
                  </h3>
                  <DetailField
                    label="Tax registration"
                    value={client.taxRegistration}
                    className="sm:col-span-2"
                  />
                </section>

                <section className="grid gap-4">
                  <h3 className="text-foreground text-sm font-semibold">Additional information</h3>
                  <DetailField label="Notes" value={client.notes} multiline />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailField label="Created" value={formatDateOnly(client.createdAt)} />
                    <DetailField label="Updated" value={formatDateOnly(client.updatedAt)} />
                  </div>
                </section>

                {client.sourceLeadId ? (
                  <section className="grid gap-2">
                    <h3 className="text-foreground text-sm font-semibold">Relationships</h3>
                    <DetailField label="Source lead" value={client.sourceLeadId} />
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>

          {client ? (
            <DialogFooter className={CLIENT_DIALOG_FOOTER_CLASS}>
              <Button
                type="button"
                variant="outline"
                className={LEAD_FORM_SECONDARY_BTN}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className={LEAD_FORM_SECONDARY_BTN}
                disabled={statusPending}
                onClick={() => setStatusConfirmOpen(true)}
              >
                {client.status === 'ACTIVE' ? (
                  <ToggleRight className="size-4" aria-hidden="true" />
                ) : (
                  <ToggleLeft className="size-4" aria-hidden="true" />
                )}
                {client.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                type="button"
                className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)}
                onClick={() => {
                  onOpenChange(false);
                  onEdit(client.id);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit client
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate client?' : 'Activate client?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusChangeIsDeactivate
                ? `Inactive clients remain in the system but are hidden from default lists.`
                : `This client will appear as active in CRM lists and selections.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={statusPending} onClick={() => void confirmStatusChange()}>
              {statusPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
