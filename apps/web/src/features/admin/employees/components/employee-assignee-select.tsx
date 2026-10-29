'use client';

import { ChevronsUpDown, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { formControlStateClass } from '@/shared/form/form-control-state';
import { cn } from '@/shared/lib/utils';
import { listEmployees } from '../api/employees';
import type { EmployeeListItem } from '../types';

type AssignableEmployee = EmployeeListItem & { platformAdminId: string };

function isAssignable(employee: EmployeeListItem): employee is AssignableEmployee {
  return Boolean(employee.platformAdminId);
}

export function EmployeeAssigneeSelect({
  value,
  onChange,
  disabled,
  invalid,
  id,
}: {
  value: string;
  onChange: (assigneeAdminId: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<readonly AssignableEmployee[]>([]);
  const [labelByAdminId, setLabelByAdminId] = useState<Map<string, string>>(() => new Map());

  const loadEmployees = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const response = await listEmployees({
        status: 'ACTIVE',
        page: 1,
        pageSize: 100,
        search: searchTerm.trim() || undefined,
        sortBy: 'displayName',
        sortDir: 'asc',
      });
      const assignable = response.items.filter(isAssignable);
      setEmployees(assignable);
      setLabelByAdminId((current) => {
        const next = new Map(current);
        for (const employee of assignable) {
          next.set(employee.platformAdminId, employee.displayName);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open && !value) return;
    void loadEmployees(open ? search : '');
  }, [open, value, search, loadEmployees]);

  const selectedLabel = value ? (labelByAdminId.get(value) ?? 'Selected employee') : 'Unassigned';

  const visibleEmployees = useMemo(() => employees, [employees]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            CRM_PIPELINE_FORM_FIELD_CLASS,
            'w-full justify-between border-0 font-normal shadow-none data-[placeholder]:text-muted-foreground/55',
            formControlStateClass(invalid ? 'invalid' : 'neutral'),
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground/55')}>{selectedLabel}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[min(100vw-2rem,32rem)] p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-border/60 border-b p-2">
          <Input
            value={search}
            placeholder="Search by name, code, email…"
            className="h-9"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-auto">
          {loading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading employees…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Code</TableHead>
                  <TableHead className="h-9 text-xs">Name</TableHead>
                  <TableHead className="hidden h-9 text-xs sm:table-cell">Department</TableHead>
                  <TableHead className="hidden h-9 text-xs md:table-cell">Job title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  className="cursor-pointer"
                  data-state={!value ? 'selected' : undefined}
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <TableCell colSpan={4} className="text-muted-foreground py-2 text-sm">
                    Unassigned
                  </TableCell>
                </TableRow>
                {visibleEmployees.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-sm">
                      No employees with a login account found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleEmployees.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer"
                      data-state={value === employee.platformAdminId ? 'selected' : undefined}
                      onClick={() => {
                        onChange(employee.platformAdminId);
                        setOpen(false);
                      }}
                    >
                      <TableCell className="py-2 text-xs tabular-nums">{employee.employeeCode}</TableCell>
                      <TableCell className="py-2 text-sm font-medium">{employee.displayName}</TableCell>
                      <TableCell className="hidden py-2 text-xs sm:table-cell">{employee.department}</TableCell>
                      <TableCell className="hidden py-2 text-xs md:table-cell">{employee.jobTitle}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
