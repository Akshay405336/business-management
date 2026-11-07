'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AttendanceWorkspaceTab = 'records' | 'settings';

const TAB_TRIGGER_CLASS =
  'h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs';

export function AttendanceWorkspaceTabs({
  value,
  onValueChange,
  showSettings = true,
  showRecords = true,
}: {
  value: AttendanceWorkspaceTab;
  onValueChange: (tab: AttendanceWorkspaceTab) => void;
  showSettings?: boolean;
  showRecords?: boolean;
}) {
  if (!showRecords && !showSettings) return null;

  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as AttendanceWorkspaceTab)}
      className="shrink-0"
    >
      <TabsList className="h-9 shrink-0 border border-[#E8E8EF] bg-[#F8F9FC] p-0.5">
        {showRecords ? (
          <TabsTrigger value="records" className={TAB_TRIGGER_CLASS}>
            Records
          </TabsTrigger>
        ) : null}
        {showSettings ? (
          <TabsTrigger value="settings" className={TAB_TRIGGER_CLASS}>
            Settings
          </TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
}
