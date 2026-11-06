'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type DailyTasksWorkspaceView = 'kanban' | 'list' | 'calendar';

export function DailyTasksViewTabs({
  value,
  onValueChange,
  includeCalendar = true,
}: {
  value: DailyTasksWorkspaceView;
  onValueChange: (view: DailyTasksWorkspaceView) => void;
  /** Admin daily tasks hides this tab. Employee workspace keeps it. */
  includeCalendar?: boolean;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as DailyTasksWorkspaceView)}
      className="shrink-0"
    >
      <TabsList className="h-9 shrink-0 border border-[#E8E8EF] bg-[#F8F9FC] p-0.5">
        <TabsTrigger
          value="kanban"
          className="h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs"
        >
          Kanban
        </TabsTrigger>
        <TabsTrigger
          value="list"
          className="h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs"
        >
          List
        </TabsTrigger>
        {includeCalendar ? (
          <TabsTrigger
            value="calendar"
            className="h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs"
          >
            Calendar
          </TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
}
