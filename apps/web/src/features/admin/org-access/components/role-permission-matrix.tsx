'use client';

import type { PermissionDefinition, PermissionKey } from '@techwin/contracts';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';

function groupPermissionsByModule(
  catalog: readonly PermissionDefinition[],
): ReadonlyMap<string, readonly PermissionDefinition[]> {
  const map = new Map<string, PermissionDefinition[]>();
  for (const item of catalog) {
    const list = map.get(item.module) ?? [];
    list.push(item);
    map.set(item.module, list);
  }
  return map;
}

export function RolePermissionMatrix({
  catalog,
  selected,
  readOnly,
  onToggle,
  onReplaceSelection,
}: {
  catalog: readonly PermissionDefinition[];
  selected: ReadonlySet<PermissionKey>;
  readOnly: boolean;
  onToggle: (key: PermissionKey, checked: boolean) => void;
  onReplaceSelection: (keys: readonly PermissionKey[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<ReadonlySet<string>>(() => new Set());

  const grouped = useMemo(() => groupPermissionsByModule(catalog), [catalog]);
  const modules = useMemo(() => [...grouped.keys()].sort((a, b) => a.localeCompare(b)), [grouped]);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((moduleName) => {
      const items = grouped.get(moduleName) ?? [];
      return (
        moduleName.toLowerCase().includes(query) ||
        items.some(
          (item) =>
            item.action.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.key.toLowerCase().includes(query),
        )
      );
    });
  }, [grouped, modules, search]);

  const toggleModule = (moduleName: string) => {
    setCollapsedModules((previous) => {
      const next = new Set(previous);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const moduleKeys = (moduleName: string): PermissionKey[] =>
    (grouped.get(moduleName) ?? []).map((item) => item.key);

  const setModuleSelection = (moduleName: string, checked: boolean) => {
    if (readOnly) return;
    const keys = new Set(selected);
    for (const key of moduleKeys(moduleName)) {
      if (checked) keys.add(key);
      else keys.delete(key);
    }
    onReplaceSelection([...keys]);
  };

  const clearSelection = () => {
    if (readOnly) return;
    onReplaceSelection([]);
  };

  const visibleItems = (moduleName: string) => {
    const query = search.trim().toLowerCase();
    const items = grouped.get(moduleName) ?? [];
    if (!query) return items;
    return items.filter(
      (item) =>
        item.action.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        moduleName.toLowerCase().includes(query),
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search permissions"
            aria-label="Search permissions"
            className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
            disabled={readOnly && catalog.length === 0}
          />
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground tabular-nums">{selected.size} selected</span>
          {!readOnly ? (
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearSelection}>
              Clear selection
            </Button>
          ) : null}
        </div>
      </div>

      {filteredModules.length === 0 ? (
        <p className="text-muted-foreground px-1 py-4 text-sm">No permissions match your search.</p>
      ) : (
        <div className="grid gap-3">
          {filteredModules.map((moduleName) => {
            const items = visibleItems(moduleName);
            if (items.length === 0) return null;
            const keys = moduleKeys(moduleName);
            const selectedInModule = keys.filter((key) => selected.has(key)).length;
            const allSelected = keys.length > 0 && selectedInModule === keys.length;
            const collapsed = collapsedModules.has(moduleName);

            return (
              <div key={moduleName} className="rounded-lg border">
                <div className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <button
                    type="button"
                    className="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm font-medium"
                    onClick={() => toggleModule(moduleName)}
                    aria-expanded={!collapsed}
                  >
                    {collapsed ? (
                      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{moduleName}</span>
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {selectedInModule}/{keys.length}
                    </span>
                  </button>
                  {!readOnly ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(value) => setModuleSelection(moduleName, value === true)}
                        aria-label={`Select all ${moduleName} permissions`}
                      />
                      All in group
                    </label>
                  ) : null}
                </div>
                {!collapsed ? (
                  <ul className="divide-y">
                    {items.map((item) => (
                      <li key={item.key}>
                        <label
                          className={
                            readOnly
                              ? 'flex items-start gap-3 px-3 py-2.5 opacity-90'
                              : 'hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-3 py-2.5'
                          }
                        >
                          <Checkbox
                            checked={selected.has(item.key)}
                            disabled={readOnly}
                            onCheckedChange={(value) => onToggle(item.key, value === true)}
                            aria-label={`${item.action}: ${item.description}`}
                          />
                          <span className="grid min-w-0 gap-0.5">
                            <span className="text-sm font-medium">{item.action}</span>
                            <span className="text-muted-foreground text-xs">{item.description}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
