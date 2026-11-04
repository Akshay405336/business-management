'use client';

import { useState } from 'react';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  CRM_HEADER_TOOLBAR_ROW_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { cn } from '@/shared/lib/utils';
import { AttendanceHeaderActions } from './attendance-header-actions';
import { AttendancePageToolbar } from './attendance-page-toolbar';
import { AttendanceRecordsProvider } from './attendance-records-context';
import { AttendanceRecordsSection } from './attendance-records-section';
import { AttendanceSettingsPanel } from './attendance-settings-panel';
import type { AttendanceWorkspaceTab } from './attendance-workspace-tabs';

export function AdminAttendanceWorkspace() {
  const [tab, setTab] = useState<AttendanceWorkspaceTab>('records');
  const recordsActive = tab === 'records';

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Attendance' }]} className="mb-0.5" />

      <AttendanceRecordsProvider active={recordsActive}>
        <section aria-label="Attendance" className="workspace-surface min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0 max-w-full rounded-lg">
            <CrmToolbarHeader
              title="Attendance"
              description="Monitor employee attendance, punch-in/punch-out records and office rules."
              layout="inline"
              className="rounded-none border-0 bg-card pb-2 shadow-none"
              titleSectionClassName="min-w-0 max-w-full sm:max-w-[min(100%,36rem)] lg:max-w-[min(100%,42rem)]"
              descriptionClassName="max-w-3xl"
              headerRowClassName="flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:flex-nowrap"
              toolbarRowClassName="shrink-0"
              toolbar={<AttendanceHeaderActions onShowRecords={() => setTab('records')} />}
              bottomRow={
                <div className={cn(CRM_HEADER_TOOLBAR_ROW_CLASS, 'lg:flex-nowrap')}>
                  <AttendancePageToolbar tab={tab} onTabChange={setTab} />
                </div>
              }
            />

            {tab === 'records' ? (
              <AttendanceRecordsSection />
            ) : (
              <div className="p-4 sm:p-5">
                <AttendanceSettingsPanel />
              </div>
            )}
          </div>
        </section>
      </AttendanceRecordsProvider>
    </div>
  );
}
