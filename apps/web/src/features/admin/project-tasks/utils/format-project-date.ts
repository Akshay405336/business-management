/** Display ISO date-only (`YYYY-MM-DD`) as `D/M/YYYY` (e.g. 31/10/2026). */
export function formatProjectDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  const day = iso.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return iso;
  const year = match[1];
  const month = match[2];
  const date = match[3];
  return `${Number(date)}/${Number(month)}/${year}`;
}
