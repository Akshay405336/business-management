'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CrmFieldLabel } from '@/features/admin/crm/components/crm-feedback';
import type { ProjectDetail } from '@/features/admin/projects/types';
import {
  addProjectPhase,
  patchProjectPhaseRow,
  projectToForm,
  type ProjectPhaseFormRow,
} from '@/features/admin/projects/utils/project-form';

export function ProjectAddPhaseDialog({
  open,
  onOpenChange,
  project,
  saving,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  saving?: boolean;
  onAdd: (phaseRows: ProjectPhaseFormRow[]) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setError(null);
  }, [open]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a phase name.');
      return;
    }
    const base = projectToForm(project).phases;
    let rows = addProjectPhase(base, project.startDate, project.expectedEndDate);
    const added = rows[rows.length - 1];
    if (!added) return;
    rows = patchProjectPhaseRow(
      rows,
      added.key,
      { name: trimmed, description: description.trim() },
      null,
      project.startDate,
      project.expectedEndDate,
    );
    await onAdd(rows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add phase</DialogTitle>
          <DialogDescription>Create a new phase for this project plan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <CrmFieldLabel htmlFor="new-phase-name" required>
              Phase name
            </CrmFieldLabel>
            <Input
              id="new-phase-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Requirements Gathering"
            />
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <CrmFieldLabel htmlFor="new-phase-desc">Description</CrmFieldLabel>
            <Textarea
              id="new-phase-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="min-h-[4.5rem] resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            Add phase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
