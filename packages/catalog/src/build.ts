import type { CatalogOption, CatalogOptionGroup } from './types.js';

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

export function buildOptions(
  namespace: string,
  category: string,
  labels: readonly string[],
): readonly CatalogOption[] {
  const categorySlug = slug(category);
  return labels.map((label) => ({
    id: `${namespace}.${categorySlug}.${slug(label)}`,
    label,
    category,
  }));
}

export function buildGroups(
  namespace: string,
  groups: readonly { readonly category: string; readonly labels: readonly string[] }[],
): readonly CatalogOptionGroup[] {
  return groups.map(({ category, labels }) => ({
    category,
    options: buildOptions(namespace, category, labels),
  }));
}

export function flattenGroups(groups: readonly CatalogOptionGroup[]): readonly CatalogOption[] {
  return groups.flatMap((group) => group.options);
}

export function customCatalogSelection(
  namespace: string,
  category: string,
  label: string,
): CatalogOption {
  const trimmed = label.trim();
  return {
    id: `${namespace}.custom.${slug(category)}.${slug(trimmed)}`,
    label: trimmed,
    category,
  };
}
