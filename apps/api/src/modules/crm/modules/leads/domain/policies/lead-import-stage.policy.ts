export type PipelineStageRef = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly sortOrder: number;
};

const DEFAULT_STAGE_NAMES = new Set(['new lead', 'new leads']);

export function normalizeStageNameForMatch(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveImportStageId(
  stages: readonly PipelineStageRef[],
  stageNameFromFile: string | undefined,
): { readonly stageId: string | null; readonly error: string | null } {
  const active = stages.filter((stage) => stage.status === 'ACTIVE');
  if (active.length === 0) {
    return {
      stageId: null,
      error: 'This pipeline has no active stages. Add a stage before importing leads.',
    };
  }

  const trimmed = stageNameFromFile?.trim();
  if (trimmed) {
    const key = normalizeStageNameForMatch(trimmed);
    const match = active.find((stage) => normalizeStageNameForMatch(stage.name) === key);
    if (!match) {
      return {
        stageId: null,
        error: `Stage "${trimmed}" was not found in the selected pipeline.`,
      };
    }
    return { stageId: match.id, error: null };
  }

  const sorted = [...active].sort((a, b) => a.sortOrder - b.sortOrder);
  const defaultStage =
    sorted.find((stage) => DEFAULT_STAGE_NAMES.has(normalizeStageNameForMatch(stage.name))) ??
    sorted[0];
  if (!defaultStage) {
    return { stageId: null, error: 'No default stage is available for import.' };
  }
  return { stageId: defaultStage.id, error: null };
}
