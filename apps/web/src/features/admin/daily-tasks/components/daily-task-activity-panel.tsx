'use client';

import type { DailyTaskActivityItem } from '../types';

function formatActivityLabel(item: DailyTaskActivityItem): string {
  const meta = item.metadata ?? {};
  switch (item.eventType) {
    case 'COMMENT_ADDED':
      return String(meta.text ?? 'Note added');
    case 'STAGE_CHANGED':
    case 'COMPLETED':
      return `Status updated (${String(meta.stageKey ?? 'stage')})`;
    case 'ASSIGNEES_CHANGED':
      return 'Assignees updated';
    case 'RESCHEDULED':
      return `Rescheduled to ${String(meta.toAssignDate ?? '')}`;
    case 'CREATED':
      return 'Task created';
    case 'UPDATED':
      return 'Task updated';
    default:
      return item.eventType.replaceAll('_', ' ').toLowerCase();
  }
}

export function DailyTaskActivityPanel({ items }: { items: readonly DailyTaskActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-xs">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="border-border/60 rounded-md border px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground font-medium">{item.actorDisplayName}</span>
            <time className="text-muted-foreground tabular-nums">
              {new Date(item.occurredAt).toLocaleString()}
            </time>
          </div>
          <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
            {formatActivityLabel(item)}
          </p>
        </li>
      ))}
    </ul>
  );
}
