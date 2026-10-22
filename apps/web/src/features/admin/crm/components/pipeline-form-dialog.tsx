'use client';

import {
  createPipelineRequestSchema,
  updatePipelineRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { GitBranch, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '../constants';
import { createPipeline, getPipeline, updatePipeline } from '../api/pipelines';
import { useAsyncAction } from '../hooks/use-async-action';
import { describeCrmError } from '../utils/errors';
import {
  addPipelineStage,
  emptyPipelineForm,
  formToCreatePayload,
  formToUpdatePayload,
  patchPipelineStageRow,
  pipelineToForm,
  reorderPipelineStages,
  replacePipelineStages,
  validatePipelineStageRows,
  type PipelineFormState,
} from '../utils/pipeline-form';
import { CrmFormField } from './crm-feedback';
import { PipelineStagesEditor } from './pipeline-stages-editor';

export function PipelineFormDialog({
  open,
  editingId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editingId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState<PipelineFormState>(() => emptyPipelineForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [stageSubmitAttempted, setStageSubmitAttempted] = useState(false);

  const resetForm = useCallback(() => {
    setForm(emptyPipelineForm());
    setFieldErrors({});
    setStageSubmitAttempted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      resetForm();
      return;
    }
    setLoadingPipeline(true);
    void getPipeline(editingId)
      .then((pipeline) => {
        setForm(pipelineToForm(pipeline));
        setFieldErrors({});
        setStageSubmitAttempted(false);
      })
      .catch((failure) => toast.error(describeCrmError(failure)))
      .finally(() => setLoadingPipeline(false));
  }, [open, editingId, resetForm, toast]);

  const onSubmit = async () => {
    setStageSubmitAttempted(true);
    const stageErrors = validatePipelineStageRows(form.stages);
    const payload = editingId ? formToUpdatePayload(form) : formToCreatePayload(form);
    const schema = editingId ? updatePipelineRequestSchema : createPipelineRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errors = { ...zodIssuesToFieldMap(parsed.error), ...stageErrors };
      setFieldErrors(errors);
      focusFirstInvalidField();
      return;
    }
    if (Object.keys(stageErrors).length > 0) {
      setFieldErrors(stageErrors);
      focusFirstInvalidField();
      return;
    }
    setFieldErrors({});
    try {
      if (editingId) {
        await run(() => updatePipeline(editingId, parsed.data));
        toast.success('Pipeline updated.');
      } else {
        await run(() =>
          createPipeline(parsed.data as Parameters<typeof createPipeline>[0]),
        );
        toast.success('Pipeline created.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (isApiError(failure) && failure.details.length > 0) {
        setFieldErrors((current) => ({ ...current, ...apiDetailsToFieldMap(failure.details) }));
        focusFirstInvalidField();
      }
      toast.error(describeCrmError(failure));
    }
  };

  const nameError = fieldErrors.name;
  const descriptionError = fieldErrors.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CRM_PIPELINE_FORM_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="size-4" aria-hidden="true" />
            {editingId ? 'Edit pipeline' : 'Add pipeline'}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Update the workflow name and manage its stages. Stages with leads cannot be removed until those leads are reassigned.'
              : 'Define a lead workflow and the ordered stages leads move through.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loadingPipeline ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading pipeline…
            </div>
          ) : (
            <div className="grid gap-6">
              <div className={formGridClass}>
                <CrmFormField
                  id="pipeline-name"
                  label="Pipeline name"
                  required
                  validated={Boolean(nameError)}
                  error={nameError}
                >
                  <Input
                    id="pipeline-name"
                    value={form.name}
                    disabled={pending}
                    className={formControlStateClass(nameError ? 'invalid' : 'neutral')}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, name: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'name');
                    }}
                  />
                </CrmFormField>
                <CrmFormField
                  id="pipeline-description"
                  label="Description"
                  optional
                  validated={Boolean(descriptionError)}
                  error={descriptionError}
                  className={formGridFullWidthClass}
                >
                  <Textarea
                    id="pipeline-description"
                    value={form.description}
                    disabled={pending}
                    rows={2}
                    className={formControlStateClass(descriptionError ? 'invalid' : 'neutral')}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, description: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'description');
                    }}
                  />
                </CrmFormField>
              </div>

              <PipelineStagesEditor
                stages={form.stages}
                fieldErrors={stageSubmitAttempted ? fieldErrors : {}}
                onAddStage={() => setForm((current) => addPipelineStage(current))}
                onPatchStage={(key, patch) =>
                  setForm((current) => patchPipelineStageRow(current, key, patch))
                }
                onReorderStages={(stages) =>
                  setForm((current) => reorderPipelineStages(current, stages))
                }
                onRemoveStages={(stages) =>
                  setForm((current) => replacePipelineStages(current, stages))
                }
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || loadingPipeline} onClick={() => void onSubmit()}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Save pipeline'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
