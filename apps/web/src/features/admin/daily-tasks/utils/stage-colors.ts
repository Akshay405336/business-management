const STAGE_HEADER: Record<string, string> = {
  slate: 'border-slate-200 bg-slate-50/80',
  blue: 'border-blue-200 bg-blue-50/80',
  amber: 'border-amber-200 bg-amber-50/80',
  emerald: 'border-emerald-200 bg-emerald-50/80',
  rose: 'border-rose-200 bg-rose-50/80',
  violet: 'border-violet-200 bg-violet-50/80',
};

export function stageHeaderClass(colorToken: string): string {
  return STAGE_HEADER[colorToken] ?? STAGE_HEADER.slate!;
}

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-sky-50 text-sky-800',
  HIGH: 'bg-amber-50 text-amber-900',
  URGENT: 'bg-rose-50 text-rose-900',
};

export function priorityBadgeClass(priority: string): string {
  return PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.MEDIUM!;
}
