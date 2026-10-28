'use client';

import {
  createPipelineRequestSchema,
  updatePipelineRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { createPipeline, getPipeline, updatePipeline } from '../api/pipelines';
import { useAsyncAction } from '../hooks/use-async-action';
import { describeCrmError } from '../utils/errors';
import {
  addPipelineStage,
  formToCreatePayload,
  formToUpdatePayload,
  patchPipelineStageRow,
  pipelineToForm,
  reorderPipelineStages,
  replacePipelineStages,
  validatePipelineStageRows,
  type PipelineFormState,
} from '../utils/pipeline-form';
import { CrmFieldLabel, CrmInlineFieldError } from './crm-feedback';
import { PipelineStagesEditor } from './pipeline-stages-editor';

const PIPELINE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PIPELINE_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const PIPELINE_DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

function emptyCreatePipelineForm(): PipelineFormState {
  return { name: '', description: '', stages: [] };
}

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
  const isCreate = editingId === null;

  const [form, setForm] = useState<PipelineFormState>(() => emptyCreatePipelineForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [stageSubmitAttempted, setStageSubmitAttempted] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showStages, setShowStages] = useState(false);

  const resetCreateForm = useCallback(() => {
    setForm(emptyCreatePipelineForm());
    setFieldErrors({});
    setStageSubmitAttempted(false);
    setShowDescription(false);
    setShowStages(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      resetCreateForm();
      return;
    }
    setLoadingPipeline(true);
    void getPipeline(editingId)
      .then((pipeline) => {
        const next = pipelineToForm(pipeline);
        setForm(next);
        setFieldErrors({});
        setStageSubmitAttempted(false);
        setShowDescription(Boolean(next.description.trim()));
        setShowStages(true);
      })
      .catch((failure) => toast.error(describeCrmError(failure)))
      .finally(() => setLoadingPipeline(false));
  }, [open, editingId, isCreate, resetCreateForm, toast]);

  const revealStages = () => {
    setShowStages(true);
    setForm((current) => (current.stages.length === 0 ? addPipelineStage(current) : current));
  };

  const onSubmit = async () => {
    setStageSubmitAttempted(true);

    let submitForm = form;
    if (isCreate && submitForm.stages.length === 0) {
      setShowStages(true);
      submitForm = addPipelineStage(submitForm);
      setForm(submitForm);
    }

    const stageErrors = validatePipelineStageRows(submitForm.stages);
    const payload = editingId ? formToUpdatePayload(submitForm) : formToCreatePayload(submitForm);
    const schema = editingId ? updatePipelineRequestSchema : createPipelineRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errors = { ...zodIssuesToFieldMap(parsed.error), ...stageErrors };
      setFieldErrors(errors);
      if (errors.description === undefined && submitForm.description.trim()) {
        setShowDescription(true);
      }
      if (Object.keys(stageErrors).length > 0 || errors.stages) {
        setShowStages(true);
      }
      focusFirstInvalidField();
      return;
    }
    if (Object.keys(stageErrors).length > 0) {
      setFieldErrors(stageErrors);
      setShowStages(true);
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
      <DialogContent className={PIPELINE_DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create pipeline' : 'Edit pipeline'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loadingPipeline ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading pipeline…
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="pipeline-name" required={isCreate}>
                  Pipeline name
                </CrmFieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <Input
                      id="pipeline-name"
                      placeholder={CRM_FORM_PLACEHOLDERS.pipelineName}
                      value={form.name}
                      disabled={pending}
                      aria-invalid={Boolean(nameError)}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(nameError ? 'invalid' : 'neutral'),
                      )}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'name');
                      }}
                    />
                    <CrmInlineFieldError message={nameError} reserveSpace={false} />
                  </div>
                  {isCreate && !showDescription ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={PIPELINE_FORM_SECONDARY_BTN}
                      disabled={pending}
                      onClick={() => setShowDescription(true)}
                    >
                      Add description
                    </Button>
                  ) : null}
                </div>
              </div>

              {(!isCreate || showDescription) && (
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="pipeline-description">Description</CrmFieldLabel>
                  <Textarea
                    id="pipeline-description"
                    placeholder={CRM_FORM_PLACEHOLDERS.pipelineDescription}
                    value={form.description}
                    disabled={pending}
                    rows={3}
                    aria-invalid={Boolean(descriptionError)}
                    className={cn(
                      CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                      formControlStateClass(descriptionError ? 'invalid' : 'neutral'),
                    )}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, description: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'description');
                    }}
                  />
                  <CrmInlineFieldError message={descriptionError} reserveSpace={false} />
                </div>
              )}

              {isCreate && !showStages ? (
                <div className="grid gap-2">
                  <CrmFieldLabel required>Pipeline stages</CrmFieldLabel>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className={PIPELINE_FORM_SECONDARY_BTN}
                      disabled={pending}
                      onClick={revealStages}
                    >
                      Add stage
                    </Button>
                  </div>
                </div>
              ) : null}

              {(!isCreate || showStages) && (
                <PipelineStagesEditor
                  stages={form.stages}
                  sectionRequired={isCreate}
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
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={PIPELINE_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', PIPELINE_FORM_PRIMARY_BTN)}
            disabled={pending || loadingPipeline}
            onClick={() => void onSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create pipeline'
            ) : (
              'Save pipeline'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
