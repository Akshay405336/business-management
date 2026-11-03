'use client';

import {
  PERMISSION_HIERARCHY,
  permissionDefinitionForKey,
  type PermissionHierarchyModule,
  type PermissionKey,
} from '@techwin/contracts';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  if (!grantable) return [...keys];
  return keys.filter((key) => grantable.has(key));
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

function moduleUniqueKeys(mod: PermissionHierarchyModule): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const group of mod.groups) {
    for (const page of group.pages) {
      for (const key of page.permissionKeys) keys.add(key);
    }
  }
  return [...keys];
}

function matchesSearch(
  query: string,
  parts: readonly string[],
): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return parts.some((part) => part.toLowerCase().includes(q));
}

export function RolePermissionMatrix({
  selected,
  readOnly,
  grantable,
  onToggle,
  onReplaceSelection,
}: {
  /** @deprecated Catalog is derived from {@link PERMISSION_HIERARCHY}; kept for call-site compatibility. */
  catalog?: unknown;
  selected: ReadonlySet<PermissionKey>;
  readOnly: boolean;
  grantable?: ReadonlySet<PermissionKey>;
  onToggle: (key: PermissionKey, checked: boolean) => void;
  onReplaceSelection: (keys: readonly PermissionKey[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<ReadonlySet<string>>(() => new Set());
  const [collapsedPages, setCollapsedPages] = useState<ReadonlySet<string>>(() => new Set());

  const query = search.trim().toLowerCase();

  const hierarchy = PERMISSION_HIERARCHY;

  const visibleModules = useMemo(() => {
    return hierarchy
      .map((mod) => {
        const modKeys = moduleUniqueKeys(mod);
        if (modKeys.length === 0) return null;

        const groups = mod.groups
          .map((group) => {
            const pages = group.pages
              .map((page) => {
                if (page.permissionKeys.length === 0) return null;
                const items = page.permissionKeys.map((key) => {
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
                    ]),
                  ]) ||
                  items.some((item) =>
                    matchesSearch(query, [item.key, item.def.action, item.def.description]),
                  );
                if (!pageMatches) return null;
                const visibleItems = query
                  ? items.filter((item) =>
                      matchesSearch(query, [
                        mod.label,
                        group.label,
                        page.label,
                        item.key,
                        item.def.action,
                        item.def.description,
                      ]),
                    )
                  : items;
                if (visibleItems.length === 0) return null;
                return { page, visibleItems };
              })
              .filter((page): page is NonNullable<typeof page> => page !== null);
            if (pages.length === 0) return null;
            return { group, pages };
          })
          .filter((group): group is NonNullable<typeof group> => group !== null);
        if (groups.length === 0) return null;
        return { mod, groups };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [hierarchy, query]);

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
    for (const mod of hierarchy) {
      for (const group of mod.groups) {
        for (const page of group.pages) {
          for (const key of page.permissionKeys) {
            if (!selected.has(key)) continue;
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
    const seen = new Set<PermissionKey>();
    return rows.filter((row) => {
      if (seen.has(row.key)) return false;
      seen.add(row.key);
      return true;
    });
  }, [hierarchy, selected]);

  const toggleModuleCollapsed = (moduleId: string) => {
    setCollapsedModules((previous) => {
      const next = new Set(previous);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const togglePageCollapsed = (pageId: string) => {
    setCollapsedPages((previous) => {
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
          {visibleModules.map(({ mod, groups }) => {
            const modKeys = moduleUniqueKeys(mod);
            const modState = computeSelectionState(modKeys, selected, grantable);
            const modSelected = modKeys.filter((key) => selected.has(key)).length;
            const modCollapsed = collapsedModules.has(mod.id) && !query;

            return (
              <div key={mod.id} className="overflow-hidden rounded-lg border border-border/80">
                <div className="bg-muted/35 flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <button
                    type="button"
                    className="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-semibold"
                    onClick={() => toggleModuleCollapsed(mod.id)}
                    aria-expanded={!modCollapsed}
                  >
                    {modCollapsed ? (
                      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{mod.label}</span>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {modSelected}/{modKeys.length}
                    </span>
                  </button>
                  {!readOnly ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={checkboxChecked(modState)}
                        onCheckedChange={(value) => setKeysChecked(modKeys, value === true)}
                        aria-label={`Select all ${mod.label} permissions`}
                      />
                      All module
                    </label>
                  ) : null}
                </div>

                {!modCollapsed ? (
                  <div className="divide-y">
                    {groups.flatMap(({ pages }) =>
                      pages.map(({ page, visibleItems }) => {
                        const pageState = computeSelectionState(
                          page.permissionKeys,
                          selected,
                          grantable,
                        );
                        const pageSelected = page.permissionKeys.filter((key) =>
                          selected.has(key),
                        ).length;
                        const pageCollapsed = collapsedPages.has(page.id) && !query;

                        return (
                          <div key={page.id} className="bg-card">
                            <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2 pl-6">
                              <button
                                type="button"
                                className="hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-medium"
                                onClick={() => togglePageCollapsed(page.id)}
                                aria-expanded={!pageCollapsed}
                              >
                                {pageCollapsed ? (
                                  <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                                ) : (
                                  <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                                )}
                                <span className="truncate">{page.label}</span>
                                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                                  {pageSelected}/{page.permissionKeys.length}
                                </span>
                              </button>
                              {!readOnly ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <label className="flex cursor-pointer items-center gap-1.5">
                                    <Checkbox
                                      checked={checkboxChecked(pageState)}
                                      onCheckedChange={(value) =>
                                        setKeysChecked(page.permissionKeys, value === true)
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
                                    onClick={() => setKeysChecked(page.permissionKeys, false)}
                                  >
                                    Clear page
                                  </Button>
                                </div>
                              ) : null}
                            </div>

                            {!pageCollapsed ? (
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
                                        disabled={readOnly || (grantable ? !grantable.has(key) : false)}
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
