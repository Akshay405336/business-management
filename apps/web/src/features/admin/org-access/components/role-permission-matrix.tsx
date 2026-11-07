'use client';

import {
  PERMISSION_HIERARCHY,
  permissionDefinitionForKey,
  type PermissionHierarchyModule,
  type PermissionHierarchyPage,
  type PermissionKey,
} from '@techwin/contracts';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';

type SelectionState = 'none' | 'partial' | 'all';

function eligibleKeys(
  keys: readonly PermissionKey[],
  grantable: ReadonlySet<PermissionKey> | undefined,
): PermissionKey[] {
  const unique = [...new Set(keys)];
  if (!grantable) return unique;
  return unique.filter((key) => grantable.has(key));
}

function uniquePagePermissionKeys(page: PermissionHierarchyPage): PermissionKey[] {
  return [...new Set(page.permissionKeys)];
}

function computeSelectionState(
  keys: readonly PermissionKey[],
  selected: ReadonlySet<PermissionKey>,
  grantable: ReadonlySet<PermissionKey> | undefined,
): SelectionState {
  const eligible = eligibleKeys(keys, grantable);
  if (eligible.length === 0) return 'none';
  const picked = eligible.filter((key) => selected.has(key)).length;
  if (picked === 0) return 'none';
  if (picked === eligible.length) return 'all';
  return 'partial';
}

function countSelected(keys: readonly PermissionKey[], selected: ReadonlySet<PermissionKey>): number {
  const unique = new Set(keys);
  let count = 0;
  for (const key of unique) {
    if (selected.has(key)) count += 1;
  }
  return count;
}

function moduleUniqueKeys(mod: PermissionHierarchyModule): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const group of mod.groups) {
    for (const page of group.pages) {
      for (const key of page.permissionKeys) keys.add(key);
    }
  }
  return [...keys];
}

function matchesSearch(query: string, parts: readonly string[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return parts.some((part) => part.toLowerCase().includes(q));
}

export function RolePermissionMatrix({
  matrixKey,
  selected,
  readOnly,
  grantable,
  onToggle,
  onReplaceSelection,
}: {
  /** Remount expansion state when the editor session changes. */
  matrixKey: string;
  /** @deprecated Catalog is derived from {@link PERMISSION_HIERARCHY}. */
  catalog?: unknown;
  selected: ReadonlySet<PermissionKey>;
  readOnly: boolean;
  grantable?: ReadonlySet<PermissionKey>;
  onToggle: (key: PermissionKey, checked: boolean) => void;
  onReplaceSelection: (keys: readonly PermissionKey[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<ReadonlySet<string>>(() => new Set());
  const [expandedPages, setExpandedPages] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setSearch('');
    setExpandedModules(new Set());
    setExpandedPages(new Set());
  }, [matrixKey]);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;

  const hierarchy = PERMISSION_HIERARCHY;

  const visibleModules = useMemo(() => {
    return hierarchy
      .map((mod) => {
        const modKeys = moduleUniqueKeys(mod);
        const modEligible = eligibleKeys(modKeys, grantable);
        if (modEligible.length === 0) return null;

        const groups = mod.groups
          .map((group) => {
            const pages = group.pages
              .map((page) => {
                const pageKeys = uniquePagePermissionKeys(page);
                if (pageKeys.length === 0) return null;
                const pageEligible = eligibleKeys(pageKeys, grantable);
                if (pageEligible.length === 0) return null;

                const items = pageEligible.map((key) => {
                  const def = permissionDefinitionForKey(key);
                  return { key, def };
                });
                const pageMatches =
                  matchesSearch(query, [
                    mod.label,
                    group.label,
                    page.label,
                    page.href ?? '',
                    ...items.flatMap((item) => [
                      item.key,
                      item.def.action,
                      item.def.description,
                      item.def.module,
                    ]),
                  ]) ||
                  items.some((item) =>
                    matchesSearch(query, [
                      item.key,
                      item.def.action,
                      item.def.description,
                      item.def.module,
                    ]),
                  );
                if (!pageMatches) return null;
                const visibleItems = searching
                  ? items.filter((item) =>
                      matchesSearch(query, [
                        mod.label,
                        group.label,
                        page.label,
                        item.key,
                        item.def.action,
                        item.def.description,
                        item.def.module,
                      ]),
                    )
                  : items;
                if (visibleItems.length === 0) return null;
                return { page, pageEligible, visibleItems };
              })
              .filter((page): page is NonNullable<typeof page> => page !== null);
            if (pages.length === 0) return null;
            return { group, pages };
          })
          .filter((group): group is NonNullable<typeof group> => group !== null);
        if (groups.length === 0) return null;
        return { mod, modEligible, groups };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [grantable, hierarchy, query, searching]);

  const totalEligible = useMemo(() => {
    const keys = new Set<PermissionKey>();
    for (const mod of hierarchy) {
      for (const key of moduleUniqueKeys(mod)) {
        if (!grantable || grantable.has(key)) keys.add(key);
      }
    }
    return keys.size;
  }, [grantable, hierarchy]);

  const selectedEligibleCount = useMemo(() => {
    let count = 0;
    for (const key of selected) {
      if (!grantable || grantable.has(key)) count += 1;
    }
    return count;
  }, [grantable, selected]);

  const selectedSummary = useMemo(() => {
    const rows: { module: string; page: string; action: string; key: PermissionKey }[] = [];
    const seen = new Set<PermissionKey>();
    for (const mod of hierarchy) {
      for (const group of mod.groups) {
        for (const page of group.pages) {
          for (const key of uniquePagePermissionKeys(page)) {
            if (!selected.has(key) || seen.has(key)) continue;
            seen.add(key);
            const def = permissionDefinitionForKey(key);
            rows.push({
              module: mod.label,
              page: page.label,
              action: def.action,
              key,
            });
          }
        }
      }
    }
    return rows;
  }, [hierarchy, selected]);

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((previous) => {
      const next = new Set(previous);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const togglePageExpanded = (pageId: string) => {
    setExpandedPages((previous) => {
      const next = new Set(previous);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const replaceKeys = (mutate: (keys: Set<PermissionKey>) => void) => {
    if (readOnly) return;
    const keys = new Set(selected);
    mutate(keys);
    onReplaceSelection([...keys]);
  };

  const setKeysChecked = (keys: readonly PermissionKey[], checked: boolean) => {
    replaceKeys((draft) => {
      for (const key of keys) {
        if (grantable && !grantable.has(key)) continue;
        if (checked) draft.add(key);
        else draft.delete(key);
      }
    });
  };

  const clearAllGrantable = () => {
    replaceKeys((draft) => {
      for (const key of draft) {
        if (!grantable || grantable.has(key)) draft.delete(key);
      }
    });
  };

  const checkboxChecked = (state: SelectionState): boolean | 'indeterminate' => {
    if (state === 'all') return true;
    if (state === 'partial') return 'indeterminate';
    return false;
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search modules, pages, or permissions"
            aria-label="Search permissions"
            className={cn(CRM_PIPELINE_SEARCH_INPUT_CLASS, inputGroupPaddingClass({ leading: true }))}
            disabled={readOnly}
          />
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {selectedEligibleCount}/{totalEligible} selected
          </span>
          {!readOnly ? (
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearAllGrantable}>
              Clear all
            </Button>
          ) : null}
        </div>
      </div>

      {selectedSummary.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Selected permissions
          </p>
          <ul className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {selectedSummary.map((row) => (
              <li key={row.key}>
                <Badge variant="secondary" className="max-w-full truncate font-normal">
                  <span className="text-muted-foreground">{row.module} · </span>
                  {row.page}: {row.action}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visibleModules.length === 0 ? (
        <p className="text-muted-foreground px-1 py-4 text-sm">No permissions match your search.</p>
      ) : (
        <div className="grid gap-2">
          {visibleModules.map(({ mod, modEligible, groups }) => {
            const modState = computeSelectionState(modEligible, selected, grantable);
            const modSelected = countSelected(modEligible, selected);
            const modExpanded = searching || expandedModules.has(mod.id);

            return (
              <div key={mod.id} className="overflow-hidden rounded-lg border border-border/80">
                <div className="bg-muted/35 flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <button
                    type="button"
                    className="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-semibold"
                    onClick={() => toggleModuleExpanded(mod.id)}
                    aria-expanded={modExpanded}
                  >
                    {modExpanded ? (
                      <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{mod.label}</span>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {modSelected}/{modEligible.length}
                    </span>
                  </button>
                  {!readOnly ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={checkboxChecked(modState)}
                        onCheckedChange={(value) => setKeysChecked(modEligible, value === true)}
                        aria-label={`Select all ${mod.label} permissions`}
                      />
                      All module
                    </label>
                  ) : null}
                </div>

                {modExpanded ? (
                  <div className="divide-y">
                    {groups.flatMap(({ pages }) =>
                      pages.map(({ page, pageEligible, visibleItems }) => {
                        const pageState = computeSelectionState(pageEligible, selected, grantable);
                        const pageSelected = countSelected(pageEligible, selected);
                        const pageExpanded = searching || expandedPages.has(page.id);

                        return (
                          <div key={page.id} className="bg-card">
                            <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2 pl-6">
                              <button
                                type="button"
                                className="hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-medium"
                                onClick={() => togglePageExpanded(page.id)}
                                aria-expanded={pageExpanded}
                              >
                                {pageExpanded ? (
                                  <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                                ) : (
                                  <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                                )}
                                <span className="truncate">{page.label}</span>
                                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                                  {pageSelected}/{pageEligible.length}
                                </span>
                              </button>
                              {!readOnly ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <label className="flex cursor-pointer items-center gap-1.5">
                                    <Checkbox
                                      checked={checkboxChecked(pageState)}
                                      onCheckedChange={(value) =>
                                        setKeysChecked(pageEligible, value === true)
                                      }
                                      aria-label={`Select all permissions for ${page.label}`}
                                    />
                                    All page
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground h-7 px-2 text-xs"
                                    onClick={() => setKeysChecked(pageEligible, false)}
                                  >
                                    Clear page
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {pageExpanded ? (
                              <ul className="divide-y divide-border/40">
                                {visibleItems.map(({ key, def }) => (
                                  <li key={`${page.id}-${key}`}>
                                    <label
                                      className={cn(
                                        'flex items-start gap-3 py-2.5 pr-3 pl-10',
                                        readOnly
                                          ? 'opacity-90'
                                          : 'hover:bg-muted/25 cursor-pointer',
                                      )}
                                    >
                                      <Checkbox
                                        className="mt-0.5"
                                        checked={selected.has(key)}
                                        disabled={
                                          readOnly || (grantable ? !grantable.has(key) : false)
                                        }
                                        onCheckedChange={(value) => onToggle(key, value === true)}
                                        aria-label={`${def.action}: ${def.description}`}
                                      />
                                      <span className="grid min-w-0 gap-0.5">
                                        <span className="text-sm font-medium">{def.action}</span>
                                        <span className="text-muted-foreground text-xs leading-snug">
                                          {def.description}
                                          {grantable && !grantable.has(key)
                                            ? ' (not grantable with your access)'
                                            : ''}
                                        </span>
                                      </span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      }),
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
