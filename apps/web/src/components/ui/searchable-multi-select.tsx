'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CatalogOptionGroup, CatalogSelection } from '@techwin/catalog';
import { dedupeSelections } from '@techwin/catalog';
import { Input } from '@/components/ui/input';
import { formFieldClass, formFieldLabelClass } from '@/shared/form/form-layout';
import { cn } from '@/shared/lib/utils';

export type MultiSelectControlState = 'neutral' | 'valid' | 'invalid';

/** @deprecated Dialog dismiss hook — inline panel no longer portals to body. */
export const SEARCHABLE_MULTI_SELECT_PANEL_ATTR = 'data-searchable-multi-select-panel';

const PANEL_MAX_HEIGHT = 288;

const CHIP_SCROLL_CLASS = 'multi-select-chip-scroll';

export function SearchableMultiSelect({
  label,
  groups,
  value,
  onChange,
  searchable = false,
  allowCustom = false,
  customCategory = 'Custom',
  customNamespace = 'custom',
  placeholder = 'Search options…',
  triggerPlaceholder = 'Select…',
  emptyLabel = 'No options available.',
  className,
  labelNode,
  disabled = false,
  controlState = 'neutral',
  onControlBlur,
}: {
  label: string;
  groups: readonly CatalogOptionGroup[];
  value: readonly CatalogSelection[];
  onChange: (next: CatalogSelection[]) => void;
  searchable?: boolean;
  allowCustom?: boolean;
  customCategory?: string;
  customNamespace?: string;
  placeholder?: string;
  /** Shown on the closed trigger when nothing is selected. */
  triggerPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  labelNode?: React.ReactNode;
  disabled?: boolean;
  controlState?: MultiSelectControlState;
  onControlBlur?: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customDraft, setCustomDraft] = useState('');
  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);

  const visibleGroups = useMemo(() => {
    if (!searchable) return groups;
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) =>
            option.label.toLowerCase().includes(q) || option.category.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    const el = chipScrollRef.current;
    if (!el || value.length === 0) return;
    el.scrollLeft = el.scrollWidth;
  }, [value.length]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((current) => {
      if (current) setQuery('');
      return !current;
    });
  };

  const toggle = (option: { id: string; label: string; category: string }) => {
    if (selectedIds.has(option.id)) {
      onChange(value.filter((item) => item.id !== option.id));
      return;
    }
    onChange(
      dedupeSelections([...value, { id: option.id, label: option.label, category: option.category }]),
    );
  };

  const addCustom = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = `${customNamespace}.custom.${slug || 'item'}`;
    if (selectedIds.has(id)) {
      setCustomDraft('');
      return;
    }
    onChange(
      dedupeSelections([
        ...value,
        { id, label: trimmed, category: customCategory, custom: true },
      ]),
    );
    setCustomDraft('');
  };

  const clearAll = () => onChange([]);

  return (
    <div ref={rootRef} className={cn(formFieldClass, 'relative max-w-full', className)}>
      <div className={cn('flex min-h-6 items-center', formFieldLabelClass)}>
        <span className="min-w-0 truncate">{labelNode ?? label}</span>
      </div>

      <div
        data-state={disabled ? 'neutral' : controlState}
        aria-invalid={!disabled && controlState === 'invalid' ? true : undefined}
        className={cn(
          'bg-background box-border flex h-12 w-full min-w-0 items-stretch overflow-hidden rounded-md border text-sm',
          'data-[state=invalid]:border-destructive data-[state=valid]:border-success/70',
          open && 'ring-ring/40 ring-[3px]',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-label={value.length === 0 ? `${label}: ${triggerPlaceholder}` : `${label}, ${value.length} selected`}
          className={cn(
            'hover:bg-accent/30 focus-visible:ring-ring/40 flex min-w-0 flex-1 items-center px-3 py-1.5 text-left',
            'focus-visible:ring-[3px] focus-visible:outline-none',
            disabled && 'pointer-events-none',
          )}
          onClick={toggleOpen}
          onBlur={onControlBlur}
        >
          <div
            ref={chipScrollRef}
            className={cn(
              CHIP_SCROLL_CLASS,
              'flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain',
              value.length > 0 ? 'flex-nowrap pr-1' : 'overflow-hidden',
            )}
            onWheel={(event) => {
              const el = chipScrollRef.current;
              if (!el || el.scrollWidth <= el.clientWidth) return;
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                el.scrollLeft += event.deltaY;
                event.preventDefault();
              }
            }}
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground truncate">{triggerPlaceholder}</span>
            ) : (
              value.map((item) => (
                <span
                  key={item.id}
                  title={item.label}
                  className="bg-muted inline-flex h-7 max-w-[min(100%,14rem)] shrink-0 items-center gap-1 rounded-md px-2 text-xs leading-none"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-sm"
                    aria-label={`Remove ${item.label}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(value.filter((entry) => entry.id !== item.id));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        onChange(value.filter((entry) => entry.id !== item.id));
                      }
                    }}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </span>
                </span>
              ))
            )}
          </div>
        </button>

        <div
          className="border-border/60 bg-background flex shrink-0 items-stretch border-l"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {value.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/40 focus-visible:ring-ring/40 flex h-full min-w-[3rem] shrink-0 items-center justify-center px-2 text-xs font-medium underline-offset-2 hover:underline focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none"
              aria-label={`Clear all ${label}`}
              onClick={clearAll}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`Open ${label} options`}
            className="text-muted-foreground hover:bg-accent/40 focus-visible:ring-ring/40 flex h-full w-10 shrink-0 items-center justify-center focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none"
            onClick={toggleOpen}
          >
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={listId}
          {...{ [SEARCHABLE_MULTI_SELECT_PANEL_ATTR]: '' }}
          className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-[100] mt-1 flex max-w-full flex-col overflow-hidden rounded-md border shadow-lg"
          style={{ maxHeight: PANEL_MAX_HEIGHT }}
        >
          {searchable ? (
            <div className="border-b p-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                aria-label={`${label} search`}
                className="h-8"
                autoFocus
              />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {visibleGroups.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-xs">{emptyLabel}</p>
            ) : (
              visibleGroups.map((group) => (
                <div key={group.category} className="mb-2 last:mb-0">
                  {groups.length > 1 ? (
                    <p className="text-muted-foreground px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                      {group.category}
                    </p>
                  ) : null}
                  <ul className="grid gap-0.5" role="listbox" aria-label={group.category} aria-multiselectable>
                    {group.options.map((option) => {
                      const checked = selectedIds.has(option.id);
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={checked}
                            className={cn(
                              'hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                              checked && 'bg-accent/70',
                            )}
                            onClick={() => toggle(option)}
                          >
                            <span
                              className={cn(
                                'flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border',
                                checked
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-input bg-background',
                              )}
                              aria-hidden="true"
                            >
                              {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
                            </span>
                            <span className="truncate">{option.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
          {allowCustom ? (
            <div className="flex gap-2 border-t p-2">
              <Input
                value={customDraft}
                onChange={(event) => setCustomDraft(event.target.value)}
                placeholder={`Custom ${label.toLowerCase()}…`}
                aria-label={`Add custom ${label}`}
                className="h-8 min-w-0 flex-1"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button
                type="button"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shrink-0 rounded-md px-3 text-xs font-medium"
                onClick={addCustom}
              >
                Add
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
