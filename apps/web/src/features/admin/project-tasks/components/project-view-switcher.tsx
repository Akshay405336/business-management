'use client';

import { ChartGantt, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ProjectManagementViewMode } from '../constants';

const VIEW_OPTIONS: {
  id: ProjectManagementViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: 'grid', label: 'Grid view', icon: LayoutGrid },
  { id: 'list', label: 'List view', icon: List },
  { id: 'gantt', label: 'Gantt chart', icon: ChartGantt },
];

export function ProjectViewSwitcher({
  value,
  onChange,
  className,
}: {
  value: ProjectManagementViewMode;
  onChange: (mode: ProjectManagementViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Project listing view"
      className={cn(
        'bg-muted inline-flex h-9 shrink-0 items-center gap-[3px] rounded-md p-[3px]',
        className,
      )}
    >
      {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            title={label}
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('h-[calc(100%-0px)] px-2.5 text-xs', active && 'shadow-xs')}
            onClick={() => onChange(id)}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label.replace(' view', '').replace(' chart', '')}</span>
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
