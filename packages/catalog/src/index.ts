export type { CatalogOption, CatalogOptionGroup, CatalogSelection } from './types.js';
export {
  buildGroups,
  buildOptions,
  customCatalogSelection,
  flattenGroups,
} from './build.js';
export {
  TECHNOLOGY_STACK_GROUPS,
  TECHNOLOGY_STACK_OPTIONS,
} from './data/technologies.js';
export { INCLUDED_PAGES_GROUPS, INCLUDED_PAGES_OPTIONS } from './data/pages.js';
export { INTEGRATIONS_GROUPS, INTEGRATIONS_OPTIONS } from './data/integrations.js';
export { ADMIN_PANEL_GROUPS, ADMIN_PANEL_OPTIONS } from './data/admin-panel.js';
export {
  HOSTING_DEPLOYMENT_GROUPS,
  HOSTING_DEPLOYMENT_OPTIONS,
} from './data/deployment.js';
export {
  DELIVERY_SERVICES_GROUPS,
  DELIVERY_SERVICES_OPTIONS,
} from './data/delivery.js';
export { PACKAGE_CATEGORY_GROUPS } from './data/package-categories.js';

import type { CatalogSelection } from './types.js';

export function dedupeSelections(
  selections: readonly {
    readonly id: string;
    readonly label: string;
    readonly category?: string;
    readonly custom?: boolean;
  }[],
): CatalogSelection[] {
  const map = new Map<string, CatalogSelection>();
  for (const item of selections) {
    if (!item.id.trim() || !item.label.trim()) continue;
    map.set(item.id, {
      id: item.id,
      label: item.label.trim(),
      ...(item.category ? { category: item.category } : {}),
      ...(item.custom ? { custom: true } : {}),
    });
  }
  return [...map.values()];
}
