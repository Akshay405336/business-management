import type { CatalogSelection, ServicePackageSnapshot } from '../types';

const joinLabels = (items: readonly CatalogSelection[], limit = 12): string => {
  if (items.length === 0) return '—';
  const head = items.slice(0, limit).map((item) => item.label);
  const tail = items.length > limit ? ` (+${items.length - limit} more)` : '';
  return `${head.join(', ')}${tail}`;
};

export function packageSnapshotSections(snapshot: ServicePackageSnapshot) {
  return [
    { title: 'Technology stack', value: joinLabels(snapshot.technologyStack) },
    { title: 'Included pages', value: joinLabels(snapshot.includedPages) },
    { title: 'Integrations', value: joinLabels(snapshot.integrations) },
    { title: 'Admin panel', value: joinLabels(snapshot.adminPanelFeatures) },
    { title: 'Hosting / deployment', value: joinLabels(snapshot.hostingDeployment) },
    { title: 'Delivery services', value: joinLabels(snapshot.deliveryServices) },
  ] as const;
}
