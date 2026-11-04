'use client';

import type { DailyTaskListItem } from '@techwin/contracts';
import { Check, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  hasDailyTaskNoteCreatePermission,
  hasDailyTaskNoteViewAllPermission,
  hasDailyTaskNoteViewOwnPermission,
} from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { DailyTaskNoteDialog } from './daily-task-note-dialog';

export function DailyTaskCardNotes({
  task,
  employeeMode,
  onChanged,
}: {
  task: DailyTaskListItem;
  employeeMode: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const { permissionSet } = usePermissions();
  const canCreate = hasDailyTaskNoteCreatePermission(permissionSet);
  const canViewOwn = hasDailyTaskNoteViewOwnPermission(permissionSet);
  const canViewAll = hasDailyTaskNoteViewAllPermission(permissionSet);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const orgNotes = task.orgTaskNotes;
  const unreadAdmin = orgNotes?.unreadCount ?? task.unreadEmployeeNoteCount ?? 0;
  const totalAdmin = orgNotes?.totalCount ?? 0;
  const hasAdminNotes = totalAdmin > 0;

  const ownNotes = task.myTaskNotes;
  const ownUnread = ownNotes?.unreadCount ?? 0;
  const ownTotal = ownNotes?.totalCount ?? 0;
  const hasOwnNotes = ownTotal > 0;

  const showAdminUnread = !employeeMode && canViewAll && hasAdminNotes && unreadAdmin > 0;
  const showAdminAcknowledged =
    !employeeMode && canViewAll && hasAdminNotes && unreadAdmin === 0;

  const showEmployeeAwaiting = employeeMode && canViewOwn && hasOwnNotes && ownUnread > 0;
  const showEmployeeSeen = employeeMode && canViewOwn && hasOwnNotes && ownUnread === 0;

  const openView = () => setViewOpen(true);

  const showEmployeeNoteButton = employeeMode && canCreate;
  const showAdminViewButton = !employeeMode && canViewAll && hasAdminNotes;

  return (
    <>
      {showEmployeeAwaiting ? (
            <button
              type="button"
              onClick={openView}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800',
                'animate-pulse motion-reduce:animate-none',
              )}
            >
              <MessageSquare className="size-3 shrink-0" aria-hidden />
              Awaiting acknowledgement
            </button>
          ) : null}
          {showEmployeeSeen ? (
            <button
              type="button"
              onClick={openView}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            >
              <Check className="size-3 shrink-0" aria-hidden />
              Seen by Admin
            </button>
          ) : null}
          {showAdminUnread ? (
            <button
              type="button"
              onClick={openView}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800',
                'animate-pulse motion-reduce:animate-none',
              )}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-rose-600" aria-hidden />
              Unread Note
              {unreadAdmin > 1 ? ` · ${unreadAdmin}` : null}
            </button>
          ) : null}
          {showAdminAcknowledged ? (
            <button
              type="button"
              onClick={openView}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            >
              <Check className="size-3 shrink-0" aria-hidden />
              Seen
            </button>
          ) : null}
          {showEmployeeNoteButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[11px] shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MessageSquare className="size-3.5" aria-hidden />
              Note
            </Button>
          ) : null}
          {showAdminViewButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-[11px] shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                openView();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MessageSquare className="size-3.5" aria-hidden />
              View Note
            </Button>
          ) : null}
      <DailyTaskNoteDialog
        task={task}
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        employeeMode={employeeMode}
        onChanged={onChanged}
      />
      <DailyTaskNoteDialog
        task={task}
        open={viewOpen}
        onOpenChange={setViewOpen}
        mode="view"
        employeeMode={employeeMode}
        onChanged={onChanged}
      />
    </>
  );
}
