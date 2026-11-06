'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLeadTags } from '../hooks/use-lead-tags';
import { LeadTagBadge } from './lead-tag-badge';

export function LeadTagFilter({
  value,
  onChange,
}: {
  value: readonly string[];
  onChange: (tagIds: string[]) => void;
}) {
  const { tags, loading } = useLeadTags(undefined, true);
  const active = value.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={active ? 'secondary' : 'outline'} size="sm" className="h-9 gap-1.5">
          <Filter className="size-3.5" aria-hidden="true" />
          Tags{active ? ` (${value.length})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <p className="text-muted-foreground px-2 py-2 text-xs">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="text-muted-foreground px-2 py-2 text-xs">No tags available.</p>
        ) : (
          tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={value.includes(tag.id)}
              onCheckedChange={(checked) => {
                if (checked) onChange([...value, tag.id]);
                else onChange(value.filter((id) => id !== tag.id));
              }}
            >
              <LeadTagBadge tag={tag} />
            </DropdownMenuCheckboxItem>
          ))
        )}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => onChange([])}>
              Clear tag filter
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
