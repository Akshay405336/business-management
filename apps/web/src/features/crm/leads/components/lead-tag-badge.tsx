'use client';

import { cn } from '@/shared/lib/utils';
import type { CrmLeadTag } from '@techwin/contracts';

export function LeadTagBadge({
  tag,
  className,
}: {
  tag: Pick<CrmLeadTag, 'name' | 'color'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[7rem] items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        className,
      )}
      style={{
        backgroundColor: `${tag.color}22`,
        color: tag.color,
        border: `1px solid ${tag.color}44`,
      }}
      title={tag.name}
    >
      {tag.name}
    </span>
  );
}
