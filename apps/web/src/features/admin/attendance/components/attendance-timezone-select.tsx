'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';

function listTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone').slice().sort();
  } catch {
    return ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London'];
  }
}

export function AttendanceTimezoneSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (tz: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const zones = useMemo(() => listTimeZones(), []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones.slice(0, 80);
    return zones.filter((z) => z.toLowerCase().includes(q)).slice(0, 80);
  }, [query, zones]);

  return (
    <div className="grid gap-2">
      <Input
        id={id}
        value={query || value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (zones.includes(next)) {
            onChange(next);
            setQuery('');
          }
        }}
        onBlur={() => {
          if (query && zones.includes(query)) onChange(query);
          setQuery('');
        }}
        placeholder="Search time zone…"
        className={CRM_PIPELINE_FORM_FIELD_CLASS}
        list="attendance-tz-list"
      />
      <datalist id="attendance-tz-list">
        {filtered.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
      <p className="text-muted-foreground text-xs">
        Selected: <span className="text-foreground font-medium">{value || '—'}</span>
      </p>
    </div>
  );
}
