'use client';

import { ArrowDown, ArrowUp, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAdminToast } from '@/features/admin/components/toast';
import { fetchDailyTaskWorkflowStages, updateDailyTaskWorkflowStages } from '../api/daily-tasks';
import type { DailyTaskWorkflowStage } from '../types';

type StageDraft = {
  id?: string;
  stageKey: string;
  name: string;
  sortOrder: number;
  colorToken: string;
  isActive: boolean;
  isCompletedStage: boolean;
};

const PROTECTED_KEYS = new Set(['todo', 'in_progress', 'review', 'completed']);

function reorderDrafts(drafts: StageDraft[], from: number, to: number): StageDraft[] {
  if (to < 0 || to >= drafts.length || from === to) return drafts;
  const next = [...drafts];
  const [item] = next.splice(from, 1);
  if (!item) return drafts;
  next.splice(to, 0, item);
  return next.map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
}

export function DailyTaskWorkflowDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const [drafts, setDrafts] = useState<StageDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchDailyTaskWorkflowStages()
      .then((r) =>
        setDrafts(
          [...r.stages]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s: DailyTaskWorkflowStage) => ({
              id: s.id,
              stageKey: s.stageKey,
              name: s.name,
              sortOrder: s.sortOrder,
              colorToken: s.colorToken,
              isActive: s.isActive,
              isCompletedStage: s.isCompletedStage,
            })),
        ),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const addStage = () => {
    const key = `custom_${Date.now()}`;
    setDrafts((current) => [
      ...current,
      {
        stageKey: key,
        name: 'New stage',
        sortOrder: current.length + 1,
        colorToken: 'slate',
        isActive: true,
        isCompletedStage: false,
      },
    ]);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await updateDailyTaskWorkflowStages({
        stages: drafts.map((stage, index) => ({ ...stage, sortOrder: index + 1 })),
      });
      toast.success('Workflow stages updated.');
      onOpenChange(false);
      await onSaved();
    } catch {
      toast.error('Could not save workflow stages. Stages with tasks cannot be removed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Daily task workflow</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto py-2">
            {drafts.map((stage, index) => (
              <div key={stage.id ?? stage.stageKey} className="border-border rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      disabled={index === 0}
                      aria-label="Move up"
                      onClick={() => setDrafts((current) => reorderDrafts(current, index, index - 1))}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      disabled={index === drafts.length - 1}
                      aria-label="Move down"
                      onClick={() => setDrafts((current) => reorderDrafts(current, index, index + 1))}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={stage.name}
                      onChange={(e) =>
                        setDrafts((current) =>
                          current.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)),
                        )
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-28"
                        value={stage.colorToken}
                        placeholder="Color token"
                        onChange={(e) =>
                          setDrafts((current) =>
                            current.map((s, i) => (i === index ? { ...s, colorToken: e.target.value } : s)),
                          )
                        }
                      />
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={stage.isActive}
                          disabled={PROTECTED_KEYS.has(stage.stageKey) && stage.isActive}
                          onChange={(e) =>
                            setDrafts((current) =>
                              current.map((s, i) => (i === index ? { ...s, isActive: e.target.checked } : s)),
                            )
                          }
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={stage.isCompletedStage}
                          onChange={(e) =>
                            setDrafts((current) =>
                              current.map((s, i) =>
                                i === index ? { ...s, isCompletedStage: e.target.checked } : s,
                              ),
                            )
                          }
                        />
                        Completed stage
                      </label>
                    </div>
                    {PROTECTED_KEYS.has(stage.stageKey) ? (
                      <p className="text-muted-foreground text-[11px]">Default stage — keep active while tasks may use it.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addStage}>
              <Plus className="mr-1.5 size-4" /> Add stage
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || loading} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save stages'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
