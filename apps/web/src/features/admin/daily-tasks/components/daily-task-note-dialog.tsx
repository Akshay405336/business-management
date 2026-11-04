'use client';

import type { DailyTaskListItem, DailyTaskNoteItem } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { EmployeeAvatar } from '@/features/admin/employees/components/employee-avatar';
import { useAdminToast } from '@/features/admin/components/toast';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { hasDailyTaskNoteAcknowledgePermission, hasDailyTaskNoteCreatePermission } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';
import {
  acknowledgeDailyTaskNote,
  createDailyTaskNote,
  listDailyTaskNotes,
} from '../api/daily-tasks';

const NOTE_MAX = 2000;

export function DailyTaskNoteDialog({
  task,
  open,
  onOpenChange,
  mode,
  employeeMode,
  onChanged,
}: {
  task: DailyTaskListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'view';
  employeeMode: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { permissionSet } = usePermissions();
  const canCreate = hasDailyTaskNoteCreatePermission(permissionSet);
  const canAcknowledge = hasDailyTaskNoteAcknowledgePermission(permissionSet);

  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<readonly DailyTaskNoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const response = await listDailyTaskNotes(task.id);
      setNotes(response.items);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Could not load notes.');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [task, toast]);

  useEffect(() => {
    if (!open || !task) {
      setDraft('');
      setNotes([]);
      return;
    }
    if (mode === 'view') void loadNotes();
  }, [loadNotes, mode, open, task]);

  const submitNote = async () => {
    if (!task) return;
    const text = draft.trim();
    if (!text) {
      toast.error('Enter a note before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await createDailyTaskNote(task.id, { text });
      toast.success('Note submitted.');
      setDraft('');
      onOpenChange(false);
      await onChanged();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Could not submit note.');
    } finally {
      setSubmitting(false);
    }
  };

  const markNoted = async (note: DailyTaskNoteItem) => {
    if (!task) return;
    setAcknowledgingId(note.id);
    try {
      await acknowledgeDailyTaskNote(task.id, note.id);
      toast.success('Marked as noted.');
      await loadNotes();
      await onChanged();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Could not acknowledge note.');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const title = mode === 'create' ? 'Add Task Note' : employeeMode ? 'Your task note' : 'Employee Task Note';
  const statusLabel = task?.workflowStageName ?? task?.stageName ?? '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 pt-1 text-left text-sm">
              <p className="text-foreground font-medium">{task?.title ?? 'Task'}</p>
              {task ? (
                <p className="text-muted-foreground text-xs">
                  Task ID: <span className="font-mono">{task.id.slice(0, 8)}…</span> · Status: {statusLabel}
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        {mode === 'create' && canCreate ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Describe the issue, blocker, clarification needed or progress update..."
              className="min-h-[8rem] resize-y"
              maxLength={NOTE_MAX}
            />
            <p className="text-muted-foreground text-right text-xs tabular-nums">
              {draft.length}/{NOTE_MAX}
            </p>
          </div>
        ) : null}

        {mode === 'view' ? (
          <div className="space-y-3">
            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading notes…
              </div>
            ) : notes.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <article
                  key={note.id}
                  className="border-border space-y-2 rounded-lg border bg-muted/20 p-3 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <EmployeeAvatar
                      displayName={note.employeeDisplayName}
                      profileImageUrl={note.employeeProfileImageUrl}
                      className="size-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{note.employeeDisplayName}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={
                        note.acknowledgementStatus === 'UNREAD'
                          ? 'rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800'
                          : 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800'
                      }
                    >
                      {note.acknowledgementStatus === 'UNREAD' ? 'Awaiting acknowledgement' : 'Seen by Admin'}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{note.text}</p>
                  {note.acknowledgementStatus === 'ACKNOWLEDGED' && note.acknowledgedAt ? (
                    <p className="text-muted-foreground text-xs">
                      Acknowledged by {note.acknowledgedByDisplayName ?? 'Admin'} ·{' '}
                      {new Date(note.acknowledgedAt).toLocaleString()}
                    </p>
                  ) : null}
                  {!employeeMode &&
                  canAcknowledge &&
                  note.acknowledgementStatus === 'UNREAD' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={acknowledgingId === note.id}
                      onClick={() => void markNoted(note)}
                    >
                      {acknowledgingId === note.id ? 'Saving…' : 'Mark as Noted'}
                    </Button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {mode === 'create' ? 'Cancel' : 'Close'}
          </Button>
          {mode === 'create' && canCreate ? (
            <Button type="button" disabled={submitting} onClick={() => void submitNote()}>
              {submitting ? 'Submitting…' : 'Submit Note'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
