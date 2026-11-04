'use client';

import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { listEmployees } from '@/features/admin/employees/api/employees';
import { formControlStateClass } from '@/shared/form/form-control-state';
import { cn } from '@/shared/lib/utils';

export function AttendanceEmployeeSelect({
  value,
  onChange,
  disabled,
  invalid,
  id,
}: {
  value: string;
  onChange: (employeeId: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<
    readonly { id: string; displayName: string; employeeCode: string }[]
  >([]);
  const [labels, setLabels] = useState<Map<string, string>>(() => new Map());

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const response = await listEmployees({
        page: 1,
        pageSize: 50,
        search: term.trim() || undefined,
        status: 'ACTIVE',
        sortBy: 'displayName',
        sortDir: 'asc',
      });
      const items = response.items.map((e) => ({
        id: e.id,
        displayName: e.displayName,
        employeeCode: e.employeeCode,
      }));
      setEmployees(items);
      setLabels((current) => {
        const next = new Map(current);
        for (const e of items) next.set(e.id, e.displayName);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open && !value) return;
    void load(open ? search : '');
  }, [open, value, search, load]);

  const selectedLabel = value ? (labels.get(value) ?? 'Selected employee') : 'Select employee';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className={cn(
            CRM_PIPELINE_FORM_FIELD_CLASS,
            'h-11 w-full justify-between font-normal',
            formControlStateClass(invalid ? 'invalid' : 'neutral'),
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-2">
        <Input
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'mb-2 h-9')}
        />
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      onChange(employee.id);
                      setOpen(false);
                    }}
                  >
                    <TableCell className="text-sm font-medium">{employee.displayName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {employee.employeeCode}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
