'use client';

import type { CrmPipeline } from '../types';
import { LeadFormDialog } from './lead-create-dialog';

/** Edit lead — same pipeline-style modal as Create lead. */
export function LeadEditDialog({
  open,
  onOpenChange,
  leadId,
  pipelines,
  onUpdated,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  pipelines: readonly CrmPipeline[];
  onUpdated: () => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  if (!open || !leadId) return null;

  return (
    <LeadFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      editLeadId={leadId}
      pipelines={pipelines}
      onSaved={onUpdated}
      onError={onError}
      dialogKey={`edit-${leadId}`}
    />
  );
}
