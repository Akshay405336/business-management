import type { OrgCalendarDayKind } from '@techwin/contracts';

export const ORG_CALENDAR_SURFACE = {
  gridGap: 'gap-2',
  weekdayHeader: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
} as const;

export type OrgCalendarCardVariant =
  | 'working'
  | 'upcomingWorking'
  | 'sundayOff'
  | 'nonWorking'
  | 'holiday'
  | 'specialWorking'
  | 'halfDay'
  | 'outsideMonth';

export type OrgCalendarCardStyle = {
  variant: OrgCalendarCardVariant;
  bg: string;
  border: string;
  text: string;
  statusLabel: string;
};

const ORG_CALENDAR_LEGEND_ALL: readonly {
  key: OrgCalendarCardVariant;
  label: string;
  sampleClass: string;
}[] = [
  { key: 'working', label: 'Working day', sampleClass: 'bg-[#E8F8F0] border-[#86EFAC] text-[#166534]' },
  { key: 'upcomingWorking', label: 'Upcoming working', sampleClass: 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8]' },
  { key: 'sundayOff', label: 'Sunday / weekly off', sampleClass: 'bg-[#F3EEFF] border-[#C4B5FD] text-[#6D28D9]' },
  { key: 'nonWorking', label: 'Non-working day', sampleClass: 'bg-[#F4F4F5] border-[#D4D4D8] text-[#52525B]' },
  { key: 'holiday', label: 'Holiday', sampleClass: 'bg-[#FEF9C3] border-[#FCD34D] text-[#92400E]' },
  { key: 'specialWorking', label: 'Special working', sampleClass: 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E40AF]' },
  { key: 'halfDay', label: 'Half working day', sampleClass: 'bg-[#F3E8FF] border-[#D8B4FE] text-[#7E22CE]' },
];

const ORG_CALENDAR_LEGEND_HIDDEN_KEYS = new Set<OrgCalendarCardVariant>(['sundayOff', 'specialWorking']);

/** Legend entries shown under the organisation calendar (grid still colours all day kinds). */
export const ORG_CALENDAR_LEGEND_ITEMS = ORG_CALENDAR_LEGEND_ALL.filter(
  (item) => !ORG_CALENDAR_LEGEND_HIDDEN_KEYS.has(item.key),
);

const CARD_STYLES: Record<OrgCalendarCardVariant, Omit<OrgCalendarCardStyle, 'variant' | 'statusLabel'>> = {
  working: {
    bg: 'bg-[#E8F8F0]',
    border: 'border-[#86EFAC]',
    text: 'text-[#166534]',
  },
  upcomingWorking: {
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#93C5FD]',
    text: 'text-[#1D4ED8]',
  },
  sundayOff: {
    bg: 'bg-[#F3EEFF]',
    border: 'border-[#C4B5FD]',
    text: 'text-[#6D28D9]',
  },
  nonWorking: {
    bg: 'bg-[#F4F4F5]',
    border: 'border-[#D4D4D8]',
    text: 'text-[#52525B]',
  },
  holiday: {
    bg: 'bg-[#FEF9C3]',
    border: 'border-[#FCD34D]',
    text: 'text-[#92400E]',
  },
  specialWorking: {
    bg: 'bg-[#DBEAFE]',
    border: 'border-[#93C5FD]',
    text: 'text-[#1E40AF]',
  },
  halfDay: {
    bg: 'bg-[#F3E8FF]',
    border: 'border-[#D8B4FE]',
    text: 'text-[#7E22CE]',
  },
  outsideMonth: {
    bg: 'bg-[#FAFAFA]',
    border: 'border-[#E4E4E7]',
    text: 'text-[#A1A1AA]',
  },
};

function weekdayFromDateKey(dateKey: string): number {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function statusLabelForKind(kind: OrgCalendarDayKind, dateKey: string): string {
  if (kind === 'WEEKLY_OFF' && weekdayFromDateKey(dateKey) === 0) return 'Sunday';
  switch (kind) {
    case 'WORKING':
      return 'Working day';
    case 'WEEKLY_OFF':
      return 'Weekly off';
    case 'HOLIDAY':
      return 'Holiday';
    case 'OFFICE_CLOSURE':
      return 'Office closure';
    case 'SPECIAL_WORKING':
      return 'Special working';
    case 'HALF_DAY':
      return 'Half day';
    case 'NON_WORKING':
      return 'Non-working day';
    default:
      return 'Working day';
  }
}

export function resolveOrgCalendarCardStyle(
  dateKey: string,
  dayKind: OrgCalendarDayKind | undefined,
  inMonth: boolean,
  todayKey: string,
): OrgCalendarCardStyle {
  const kind = dayKind ?? 'WORKING';
  const isFuture = dateKey > todayKey;
  let variant: OrgCalendarCardVariant = 'working';

  if (kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE') variant = 'holiday';
  else if (kind === 'SPECIAL_WORKING') variant = 'specialWorking';
  else if (kind === 'HALF_DAY') variant = 'halfDay';
  else if (kind === 'WEEKLY_OFF') variant = 'sundayOff';
  else if (kind === 'NON_WORKING') variant = 'nonWorking';
  else if (kind === 'WORKING' && isFuture) variant = 'upcomingWorking';

  if (!inMonth) {
    if (variant === 'working' || variant === 'upcomingWorking') {
      return {
        variant: 'outsideMonth',
        ...CARD_STYLES.outsideMonth,
        statusLabel: 'Adjacent month',
      };
    }
    const base = CARD_STYLES[variant];
    return {
      variant,
      ...base,
      statusLabel: statusLabelForKind(kind, dateKey),
    };
  }

  const base = CARD_STYLES[variant];
  return {
    variant,
    ...base,
    statusLabel: statusLabelForKind(kind, dateKey),
  };
}

export function todayHighlightClass(isToday: boolean, isSelected: boolean): string {
  if (isToday) {
    return 'ring-2 ring-[#6366F1] ring-offset-2 shadow-md';
  }
  if (isSelected) {
    return 'ring-2 ring-[#A78BFA] ring-offset-1 shadow-sm';
  }
  return 'shadow-sm hover:shadow-md';
}

/** Shared modal shell: scrollable body, fixed footer */
export const ORG_CALENDAR_DIALOG_SHELL =
  'flex max-h-[min(92vh,820px)] w-[min(100%,560px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none';

export const ORG_CALENDAR_DIALOG_BODY = 'min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6';
export const ORG_CALENDAR_DIALOG_FOOTER =
  'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-card px-5 py-3 sm:px-6';
