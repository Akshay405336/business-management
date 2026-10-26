import { Badge } from '@/components/ui/badge';
import type { EmployeeEmploymentStatus } from '../types';
import { labelEmployeeStatus } from '../utils/labels';

const statusVariant = (
  status: EmployeeEmploymentStatus,
): 'default' | 'secondary' | 'outline' | 'success' => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ON_LEAVE') return 'secondary';
  if (status === 'TERMINATED') return 'outline';
  return 'outline';
};

export function EmployeeStatusBadge({ status }: { status: EmployeeEmploymentStatus }) {
  return <Badge variant={statusVariant(status)}>{labelEmployeeStatus(status)}</Badge>;
}
