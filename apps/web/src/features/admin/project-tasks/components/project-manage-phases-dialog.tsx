'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';
import {
  ProjectPhasesEditor,
  validatePhaseFormRows,
} from '@/features/admin/projects/components/project-phases-editor';
import type { ProjectDetail } from '@/features/admin/projects/types';
import {
  addProjectPhase,
  patchProjectPhaseRow,
  projectToForm,
  reorderProjectPhases,
  type ProjectPhaseFormRow,
} from '@/features/admin/projects/utils/project-form';
import { cn } from '@/shared/lib/utils';
import type { ProjectTaskBoardPhase } from '../types';
import { buildSavePlanPayload } from '../utils/build-save-plan-payload';

const PHASES_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PHASES_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const MANAGE_PHASES_DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

export function ProjectManagePhasesDialog({
  open,
  onOpenChange,
  project,
  boardPhases,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetail;
  boardPhases: readonly ProjectTaskBoardPhase[];
  saving?: boolean;
  onSave: (phaseRows: ProjectPhaseFormRow[]) => Promise<void>;
}) {
  const [phases, setPhases] = useState<ProjectPhaseFormRow[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhases(projectToForm(project).phases);
    setSubmitAttempted(false);
  }, [open, project]);

  const fieldErrors = useMemo(
    () =>
      submitAttempted
        ? validatePhaseFormRows(phases, project.startDate, project.expectedEndDate)
        : {},
    [phases, project.expectedEndDate, project.startDate, submitAttempted],
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const handleSave = async () => {
    setSubmitAttempted(true);
    const errors = validatePhaseFormRows(phases, project.startDate, project.expectedEndDate);
    if (Object.keys(errors).length > 0) return;
    if (phases.length === 0) return;
    buildSavePlanPayload(project, boardPhases, phases);
    await onSave(phases);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MANAGE_PHASES_DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Manage phases
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            Add, rename, reorder, or remove phases. Removing a phase deletes its tasks when you save
            the plan.
          </p>
          <ProjectPhasesEditor
            phases={phases}
            projectStartDate={project.startDate}
            projectExpectedEndDate={project.expectedEndDate}
            fieldErrors={fieldErrors}
            submitAttempted={submitAttempted}
            variant="pipeline"
            onAddPhase={() =>
              setPhases((current) =>
                addProjectPhase(current, project.startDate, project.expectedEndDate),
              )
            }
            onPatchPhase={(key, patch, manualDateField) =>
              setPhases((current) =>
                patchProjectPhaseRow(
                  current,
                  key,
                  patch,
                  manualDateField ?? null,
                  project.startDate,
                  project.expectedEndDate,
                ),
              )
            }
            onReorderPhases={(next) =>
              setPhases(reorderProjectPhases(next, project.startDate, project.expectedEndDate))
            }
            onRemovePhases={setPhases}
          />
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={PHASES_FORM_SECONDARY_BTN}
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', PHASES_FORM_PRIMARY_BTN)}
            disabled={saving || (submitAttempted && hasErrors)}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Save phases'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
