'use client';

import { Loader2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CrmLeadTag } from '@techwin/contracts';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import { createLeadTag } from '../api/lead-tag.api';
import { useLeadTags } from '../hooks/use-lead-tags';
import { describeCrmError } from '../utils/errors';
import { LeadTagBadge } from './lead-tag-badge';

export function LeadTagSelector({
  value,
  onChange,
  disabled,
  className,
  knownTags = [],
}: {
  value: readonly string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
  className?: string;
  knownTags?: readonly CrmLeadTag[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [resolvedById, setResolvedById] = useState<Map<string, CrmLeadTag>>(() => new Map());
  const toast = useAdminToast();
  const { tags: loadedTags, loading, refetch } = useLeadTags(undefined, true);

  const tags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return loadedTags;
    return loadedTags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [loadedTags, search]);

  useEffect(() => {
    setResolvedById((current) => {
      const next = new Map(current);
      for (const tag of knownTags) next.set(tag.id, tag);
      for (const tag of loadedTags) next.set(tag.id, tag);
      return next;
    });
  }, [knownTags, loadedTags]);

  const catalog = useMemo(() => {
    const byId = new Map<string, CrmLeadTag>(resolvedById);
    for (const tag of knownTags) byId.set(tag.id, tag);
    for (const tag of loadedTags) byId.set(tag.id, tag);
    return byId;
  }, [knownTags, loadedTags, resolvedById]);

  const selected = useMemo(
    () => value.map((id) => catalog.get(id)).filter(Boolean) as CrmLeadTag[],
    [catalog, value],
  );

  const available = tags.filter((tag) => !value.includes(tag.id));
  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !tags.some((tag) => tag.name.toLowerCase() === trimmedSearch.toLowerCase());

  const rememberTag = (tag: CrmLeadTag) => {
    setResolvedById((current) => {
      if (current.get(tag.id) === tag) return current;
      const next = new Map(current);
      next.set(tag.id, tag);
      return next;
    });
  };

  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
      return;
    }
    const tag = catalog.get(tagId) ?? tags.find((item) => item.id === tagId);
    if (tag) rememberTag(tag);
    onChange([...value, tagId]);
  };

  const createTag = async () => {
    if (!trimmedSearch || creating) return;
    setCreating(true);
    try {
      const created = await createLeadTag({ name: trimmedSearch });
      rememberTag(created);
      refetch();
      onChange([...value, created.id]);
      setSearch('');
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {selected.map((tag) => (
        <span key={tag.id} className="inline-flex items-center gap-0.5">
          <LeadTagBadge tag={tag} />
          {!disabled ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded p-0.5"
              aria-label={`Remove ${tag.name}`}
              onClick={() => toggle(tag.id)}
            >
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      {!disabled ? (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
              <Plus className="size-3.5" aria-hidden="true" />
              Add tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tags…"
              className="mb-2 h-8 text-sm"
            />
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                Loading tags…
              </div>
            ) : available.length === 0 && !canCreate ? (
              <p className="text-muted-foreground py-1 text-xs">No matching tags.</p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {available.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      className="hover:bg-muted flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm"
                      onClick={() => toggle(tag.id)}
                    >
                      <LeadTagBadge tag={tag} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canCreate ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 w-full justify-start text-xs"
                disabled={creating}
                onClick={() => void createTag()}
              >
                Create “{trimmedSearch}”
              </Button>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
