import { Eye, SquarePen, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import type { CrmClient } from '../types/client.types';

type ClientActionsProps = {
  client: CrmClient;
  disabled?: boolean;
  onToggleStatus: (client: CrmClient) => void;
  onView: (client: CrmClient) => void;
  onEdit: (client: CrmClient) => void;
  onDelete: (client: CrmClient) => void;
};

export function ClientActions({
  client,
  disabled,
  onToggleStatus,
  onView,
  onEdit,
  onDelete,
}: ClientActionsProps) {
  return (
    <div className="flex w-full shrink-0 items-center justify-end gap-1">
      <TableIconButton
        label={`View ${client.name}`}
        disabled={disabled}
        onClick={() => onView(client)}
      >
        <Eye className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
      <TableIconButton
        label={client.status === 'ACTIVE' ? `Deactivate ${client.name}` : `Activate ${client.name}`}
        tone="default"
        className={
          client.status === 'ACTIVE'
            ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
            : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
        }
        disabled={disabled}
        onClick={() => onToggleStatus(client)}
      >
        {client.status === 'ACTIVE' ? (
          <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
        ) : (
          <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
        )}
      </TableIconButton>
      <TableIconButton
        label={`Edit ${client.name}`}
        tone="default"
        className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
        disabled={disabled}
        onClick={() => onEdit(client)}
      >
        <SquarePen className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
      <TableIconButton
        label={`Delete ${client.name}`}
        tone="default"
        className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
        disabled={disabled}
        onClick={() => onDelete(client)}
      >
        <Trash2 className="size-4 stroke-[2]" aria-hidden="true" />
      </TableIconButton>
    </div>
  );
}
