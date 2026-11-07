import { Badge } from '@/components/ui/badge';
import type { EmployeeEmploymentStatus } from '../types';
import { labelEmployeeStatus } from '../utils/employee-formatters';

export function EmployeeStatusBadge({ status }: { status: EmployeeEmploymentStatus }) {
  if (status === 'ACTIVE') {
    return (
      <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
        Active
      </Badge>
    );
  }
  if (status === 'INACTIVE') {
    return (
      <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
        Inactive
      </Badge>
    );
  }
  return <Badge variant="outline">{labelEmployeeStatus(status)}</Badge>;
}
