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
  CRM_PIPELINE_DIALOG_BODY_CLASS,
  CRM_PIPELINE_DIALOG_FOOTER_CLASS,
  CRM_PIPELINE_DIALOG_HEADER_CLASS,
  CRM_PIPELINE_DIALOG_SHELL_CLASS,
  CRM_PIPELINE_DIALOG_TITLE_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
  CRM_PIPELINE_PRIMARY_BUTTON_CLASS,
  CRM_PIPELINE_SECONDARY_BUTTON_CLASS,
} from '@/features/admin/crm/constants';
import { CRM_FORM_PLACEHOLDERS } from '@/features/admin/crm/constants/form-placeholders';
import type { CreatePipelineRequest } from '../types/pipeline.types';
import { useCreatePipeline, usePipeline, useUpdatePipeline } from '../hooks';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
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
} from '../utils/pipeline.utils';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { PipelineStagesEditor } from './pipeline-stages-editor';

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
  const { createPipeline, pending: createPending } = useCreatePipeline();
  const { updatePipeline, pending: updatePending } = useUpdatePipeline();
  const {
    loading: loadingPipeline,
    pipeline: loadedPipeline,
    error: loadPipelineError,
  } = usePipeline(open && editingId ? editingId : null, open && editingId !== null);
  const pending = createPending || updatePending;
  const isCreate = editingId === null;

  const [form, setForm] = useState<PipelineFormState>(() => emptyCreatePipelineForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    if (!loadedPipeline || loadedPipeline.id !== editingId) return;
    const next = pipelineToForm(loadedPipeline);
    setForm(next);
    setFieldErrors({});
    setStageSubmitAttempted(false);
    setShowDescription(Boolean(next.description.trim()));
    setShowStages(true);
  }, [open, editingId, isCreate, loadedPipeline, resetCreateForm]);

  useEffect(() => {
    if (loadPipelineError) toast.error(loadPipelineError);
  }, [loadPipelineError, toast]);

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
        await updatePipeline(editingId, parsed.data);
        toast.success('Pipeline updated.');
      } else {
        await createPipeline(parsed.data as CreatePipelineRequest);
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
      <DialogContent className={CRM_PIPELINE_DIALOG_SHELL_CLASS}>
        <DialogHeader className={CRM_PIPELINE_DIALOG_HEADER_CLASS}>
          <DialogTitle className={CRM_PIPELINE_DIALOG_TITLE_CLASS}>
            {isCreate ? 'Create pipeline' : 'Edit pipeline'}
          </DialogTitle>
        </DialogHeader>

        <div className={CRM_PIPELINE_DIALOG_BODY_CLASS}>
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
                      className={CRM_PIPELINE_SECONDARY_BUTTON_CLASS}
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
                      className={CRM_PIPELINE_SECONDARY_BUTTON_CLASS}
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

        <DialogFooter className={CRM_PIPELINE_DIALOG_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={CRM_PIPELINE_SECONDARY_BUTTON_CLASS}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', CRM_PIPELINE_PRIMARY_BUTTON_CLASS)}
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
