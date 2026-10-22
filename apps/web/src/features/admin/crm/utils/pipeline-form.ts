import type { CrmPipeline, CrmPipelineStage } from '../types';
import { normalizeStageColor } from './stage-color';
import { STAGE_COLOR_PRESETS } from '../constants';

export type PipelineStageFormRow = {
  key: string;
  id: string | null;
  persisted: boolean;
  name: string;
  color: string;
};

export type PipelineFormState = {
  name: string;
  description: string;
  stages: PipelineStageFormRow[];
};

export const newPipelineStageRow = (partial?: Partial<PipelineStageFormRow>): PipelineStageFormRow => ({
  key: partial?.key ?? `stage-${crypto.randomUUID()}`,
  id: partial?.id ?? null,
  persisted: partial?.persisted ?? false,
  name: partial?.name ?? '',
  color: partial?.color ?? normalizeStageColor(STAGE_COLOR_PRESETS[0]),
});

export const emptyPipelineForm = (): PipelineFormState => ({
  name: '',
  description: '',
  stages: [newPipelineStageRow()],
});

function stageToRow(stage: CrmPipelineStage): PipelineStageFormRow {
  return newPipelineStageRow({
    key: stage.id,
    id: stage.id,
    persisted: true,
    name: stage.name,
    color: normalizeStageColor(stage.color),
  });
}

export function pipelineToForm(pipeline: CrmPipeline): PipelineFormState {
  const activeStages = pipeline.stages
    .filter((stage) => stage.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    name: pipeline.name,
    description: pipeline.description ?? '',
    stages: activeStages.length > 0 ? activeStages.map(stageToRow) : [newPipelineStageRow()],
  };
}

export function formToCreatePayload(form: PipelineFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    stages: form.stages.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      color: normalizeStageColor(row.color),
    })),
  };
}

export function formToUpdatePayload(form: PipelineFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    stages: form.stages.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      color: normalizeStageColor(row.color),
    })),
  };
}

export function addPipelineStage(form: PipelineFormState): PipelineFormState {
  return { ...form, stages: [...form.stages, newPipelineStageRow()] };
}

export function patchPipelineStageRow(
  form: PipelineFormState,
  key: string,
  patch: Partial<PipelineStageFormRow>,
): PipelineFormState {
  return {
    ...form,
    stages: form.stages.map((row) => (row.key === key ? { ...row, ...patch } : row)),
  };
}

export function reorderPipelineStages(
  form: PipelineFormState,
  stages: PipelineStageFormRow[],
): PipelineFormState {
  return { ...form, stages };
}

export function replacePipelineStages(
  form: PipelineFormState,
  stages: PipelineStageFormRow[],
): PipelineFormState {
  return { ...form, stages };
}

export function validatePipelineStageRows(
  stages: readonly PipelineStageFormRow[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  stages.forEach((row, index) => {
    const name = row.name.trim();
    if (!name) {
      errors[`stages.${index}.name`] = 'Enter a stage name.';
    }
    const key = name.toLowerCase();
    if (name && seen.has(key)) {
      errors[`stages.${index}.name`] = 'Stage names must be unique within a pipeline.';
    }
    if (name) seen.add(key);
    if (!/^#[0-9a-fA-F]{6}$/.test(normalizeStageColor(row.color))) {
      errors[`stages.${index}.color`] = 'Select a color.';
    }
  });
  if (stages.length === 0) {
    errors.stages = 'Add at least one stage.';
  }
  return errors;
}
