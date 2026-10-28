/** Derives a stable organization role key from a display name (create flow). */
export function slugifyRoleKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 64);
  if (!slug) return 'role';
  return /^[a-z]/.test(slug) ? slug : `role_${slug}`.slice(0, 64);
}
