export const servicePackageKeys = {
  all: ['crm', 'service-packages'] as const,
  lists: () => [...servicePackageKeys.all, 'list'] as const,
  list: () => [...servicePackageKeys.lists()] as const,
  details: () => [...servicePackageKeys.all, 'detail'] as const,
  detail: (id: string) => [...servicePackageKeys.details(), id] as const,
  codePreview: () => [...servicePackageKeys.all, 'code-preview'] as const,
};
