'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';

export function DailyTaskToolbar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-w-0 w-full flex-col gap-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DailyTaskToolbarSearch({
  search,
  onSearchChange,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
        <Input
          className={cn(
            CRM_PIPELINE_SEARCH_INPUT_CLASS,
            inputGroupPaddingClass({ leading: true }),
            'min-w-0',
          )}
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search tasks"
        />
      </InputGroup>
    </div>
  );
}
