'use client';

import { useState } from 'react';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  CRM_HEADER_TOOLBAR_ROW_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { cn } from '@/shared/lib/utils';
import { AttendanceHeaderActions } from './attendance-header-actions';
import { AttendancePageToolbar } from './attendance-page-toolbar';
import { AttendanceRecordsProvider } from './attendance-records-context';
import { AttendanceRecordsSection } from './attendance-records-section';
import { AttendanceSettingsDialog } from './attendance-settings-dialog';
import type { AttendanceWorkspaceTab } from './attendance-workspace-tabs';
import type { AttendanceRecordsScope } from '../hooks/use-attendance-records-list';
import { AttendanceSelfPunchPanel } from './attendance-self-punch-panel';

export function AdminAttendanceWorkspace({
  scope,
}: {
  /** When omitted, uses organization vs self based on attendance permissions. */
  scope?: AttendanceRecordsScope;
}) {
  const { has, hasAny } = useAdminAccess();
  const resolvedScope: AttendanceRecordsScope =
    scope ??
    (has('attendance.view_all') || has('attendance.manage_settings')
      ? 'organization'
      : 'self');
  const selfService = resolvedScope === 'self';

  const [settingsOpen, setSettingsOpen] = useState(false);
  const tab: AttendanceWorkspaceTab = settingsOpen ? 'settings' : 'records';
  const canManageSettings = hasAny('attendance.manage_settings', 'attendance.view_all');

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Attendance' }]} className="mb-0.5" />

      <AttendanceRecordsProvider active scope={resolvedScope}>
        <section aria-label="Attendance" className="workspace-surface min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0 max-w-full rounded-lg">
            <CrmToolbarHeader
              title="Attendance"
              description={
                selfService
                  ? 'Punch in and out, and review your attendance history.'
                  : 'Monitor employee attendance, punch-in/punch-out records and office rules.'
              }
              layout="inline"
              descriptionTruncate={selfService}
              className="rounded-none border-0 bg-card pb-2 shadow-none"
              titleSectionClassName="min-w-0 max-w-full sm:max-w-[min(100%,36rem)] lg:max-w-[min(100%,42rem)]"
              descriptionClassName="max-w-3xl"
              headerRowClassName="flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:flex-nowrap"
              toolbarRowClassName="min-w-0 shrink-0"
              toolbar={
                selfService ? (
                  <AttendancePageToolbar
                    tab="records"
                    onTabChange={() => {}}
                    layout="header"
                  />
                ) : canManageSettings ? (
                  <AttendanceHeaderActions onShowRecords={() => setSettingsOpen(false)} />
                ) : null
              }
              bottomRow={
                selfService ? undefined : (
                  <div className={cn(CRM_HEADER_TOOLBAR_ROW_CLASS, 'lg:flex-nowrap')}>
                    <AttendancePageToolbar
                      tab={tab}
                      onTabChange={(next) => setSettingsOpen(next === 'settings')}
                    />
                  </div>
                )
              }
            />

            {selfService ? <AttendanceSelfPunchPanel /> : null}
            <AttendanceRecordsSection />
            {canManageSettings ? (
              <AttendanceSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
            ) : null}
          </div>
        </section>
      </AttendanceRecordsProvider>
    </div>
  );
}
