import { Mail, SquarePen, Trash2 } from 'lucide-react';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import type { CrmQuotation } from '../types/quotation.types';
import { canSendQuotation } from '../utils/quotation.utils';

type QuotationActionsProps = {
  quotation: CrmQuotation;
  disabled?: boolean;
  onSend: (quotation: CrmQuotation) => void;
  onEdit: (quotation: CrmQuotation) => void;
  onDelete: (quotation: CrmQuotation) => void;
};

export function QuotationActions({
  quotation,
  disabled,
  onSend,
  onEdit,
  onDelete,
}: QuotationActionsProps) {
  const canMutate = quotation.status === 'DRAFT';
  const sendEnabled = canSendQuotation(quotation.status);

  return (
    <div className="flex w-full shrink-0 items-center justify-end gap-1">
      <TableIconButton
        label={
          sendEnabled
            ? `Send ${quotation.documentNumber}`
            : `${quotation.documentNumber} cannot be sent`
        }
        disabled={disabled || !sendEnabled}
        onClick={() => onSend(quotation)}
      >
        <Mail className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
      <TableIconButton
        label={
          canMutate
            ? `Edit ${quotation.documentNumber}`
            : `${quotation.documentNumber} cannot be edited`
        }
        tone="default"
        className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
        disabled={disabled || !canMutate}
        onClick={() => onEdit(quotation)}
      >
        <SquarePen className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
      <TableIconButton
        label={
          canMutate
            ? `Delete ${quotation.documentNumber}`
            : `${quotation.documentNumber} cannot be deleted`
        }
        tone="default"
        className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black disabled:opacity-100 disabled:hover:bg-transparent"
        disabled={disabled || !canMutate}
        onClick={() => onDelete(quotation)}
      >
        <Trash2 className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
    </div>
  );
}
