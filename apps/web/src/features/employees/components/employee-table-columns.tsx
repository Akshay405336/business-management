import { TableHead, TableRow } from '@/components/ui/table';
import { CRM_EMPLOYEES_TABLE_COLUMN_CLASS } from '@/features/admin/components/data-table-presets';
import { cn } from '@/shared/lib/utils';

export function EmployeeTableColumns() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.employee}>Employee</TableHead>
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.email}>Email</TableHead>
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.phone}>Phone</TableHead>
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.type}>Employment Type</TableHead>
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.joined}>Joining Date</TableHead>
      <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.status}>Status</TableHead>
      <TableHead className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions, 'text-right')}>Actions</TableHead>
    </TableRow>
  );
}
