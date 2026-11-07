import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmployeeLeaveRecordsNoConfigurationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-foreground text-base font-semibold">No active leave balance configuration</p>
      <p className="text-muted-foreground max-w-md text-sm">
        Employee leave records are generated automatically when you create an active Leave Balance
        configuration. Create or activate a configuration to view entitlements here.
      </p>
      <Button asChild variant="outline" className="mt-1 h-9">
        <Link href="/admin/leave-balances">Go to Leave Balances</Link>
      </Button>
    </div>
  );
}

export function EmployeeLeaveRecordsNoEmployeesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-foreground text-base font-semibold">No eligible employees</p>
      <p className="text-muted-foreground max-w-md text-sm">
        This configuration has no employee allocation records yet. Allocations are created when the
        configuration is saved and balances are generated for eligible employees.
      </p>
    </div>
  );
}
