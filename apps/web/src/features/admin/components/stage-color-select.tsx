'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { stageColorOptions, normalizeStageColor } from '@/features/admin/crm/utils/stage-color';

export function StageColorSelect({
  id,
  value,
  onValueChange,
  'aria-label': ariaLabel = 'Stage color',
}: {
  id?: string;
  value: string;
  onValueChange: (color: string) => void;
  'aria-label'?: string;
}) {
  const normalized = normalizeStageColor(value);
  const options = stageColorOptions(normalized);

  return (
    <Select value={normalized} onValueChange={(next) => onValueChange(normalizeStageColor(next))}>
      <SelectTrigger id={id} className="w-full" aria-label={ariaLabel}>
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
          <span
            className="size-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: normalized }}
            aria-hidden="true"
          />
          <span className="font-mono text-sm">{normalized}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((color) => (
          <SelectItem key={color} value={normalizeStageColor(color)}>
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-full border border-black/10"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {normalizeStageColor(color)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
