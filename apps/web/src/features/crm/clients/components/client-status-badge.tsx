import { Badge } from '@/components/ui/badge';
import type { ClientStatus } from '../types/client.types';

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  if (status === 'ACTIVE') {
    return (
      <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
      Inactive
    </Badge>
  );
}
