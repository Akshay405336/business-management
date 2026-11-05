import { API_ERROR_CODES } from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

export function pipelineDeleteBlockedMessage(leadCount: number): string {
  const countLine =
    leadCount > 0
      ? `${leadCount} lead${leadCount === 1 ? ' is' : 's are'} currently associated with this pipeline. `
      : '';
  return `${countLine}This pipeline cannot be deleted because one or more leads are associated with it. Leads depend on this pipeline and its stages. Please reassign or remove all associated leads before deleting this pipeline.`.trim();
}

export function leadCountFromPipelineDeleteError(error: unknown, fallback = 0): number {
  if (!isApiError(error) || error.code !== API_ERROR_CODES.PIPELINE_HAS_DEPENDENT_LEADS) {
    return fallback;
  }
  const detail = error.details.find((item) => item.path === 'leadCount');
  if (!detail) return fallback;
  const parsed = Number(detail.message);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isPipelineDeleteBlockedError(error: unknown): boolean {
  return isApiError(error) && error.code === API_ERROR_CODES.PIPELINE_HAS_DEPENDENT_LEADS;
}
