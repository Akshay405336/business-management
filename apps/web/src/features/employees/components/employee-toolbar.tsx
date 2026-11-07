'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { cn } from '@/shared/lib/utils';
import type { EmployeeEmploymentStatus, EmployeeEmploymentType } from '../types';
import { EmployeeStatusFilter, EmployeeTypeFilter } from './employee-filters';

type Props = {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchDebounceRef: RefObject<ReturnType<typeof setTimeout> | null>;
  statusFilter: 'ALL' | EmployeeEmploymentStatus;
  onStatusFilterChange: (value: 'ALL' | EmployeeEmploymentStatus) => void;
  typeFilter: 'ALL' | EmployeeEmploymentType;
  onTypeFilterChange: (value: 'ALL' | EmployeeEmploymentType) => void;
  refreshing: boolean;
  canCreate: boolean;
  onCreate: () => void;
};

export function EmployeeToolbar({
  searchDraft,
  onSearchDraftChange,
  onSearchSubmit,
  searchDebounceRef,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  refreshing,
  canCreate,
  onCreate,
}: Props) {
  return (
    <CrmToolbarHeader
      title="Employees"
      description=""
      descriptionClassName="hidden"
      className="rounded-none border-0 bg-card shadow-none"
      titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
      toolbar={
        <>
          <form
            className={CRM_HEADER_SEARCH_FORM_CLASS}
            onSubmit={(event) => {
              event.preventDefault();
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              onSearchSubmit();
            }}
          >
            <InputGroup
              leading={
                refreshing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search aria-hidden="true" />
                )
              }
              className="min-w-0 max-w-full"
            >
              <Input
                className={cn(CRM_PIPELINE_SEARCH_INPUT_CLASS, inputGroupPaddingClass({ leading: true }))}
                value={searchDraft}
                onChange={(event) => onSearchDraftChange(event.target.value)}
                placeholder="Search by name, code, email, or phone"
                aria-label="Search employees"
              />
            </InputGroup>
          </form>
          <EmployeeStatusFilter value={statusFilter} onChange={onStatusFilterChange} />
          <EmployeeTypeFilter value={typeFilter} onChange={onTypeFilterChange} />
          {canCreate ? (
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
              onClick={onCreate}
            >
              <Plus aria-hidden="true" />
              Add employee
            </Button>
          ) : null}
        </>
      }
    />
  );
}
