import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type {
  CrmPipeline,
  CrmPipelineListResponse,
  CrmPipelineStage,
  CreatePipelineRequest,
  CreatePipelineStageRequest,
  ReorderPipelineStagesRequest,
  UpdatePipelineRequest,
  UpdatePipelineStageRequest,
} from '../types';

export function listPipelines(signal?: AbortSignal): Promise<CrmPipelineListResponse> {
  return apiRequest<CrmPipelineListResponse>(CRM_ROUTES.pipelines, { auth: true, signal });
}

export function getDefaultPipeline(signal?: AbortSignal): Promise<CrmPipeline> {
  return apiRequest<CrmPipeline>(CRM_ROUTES.defaultPipeline, { auth: true, signal });
}

export function getPipeline(id: string, signal?: AbortSignal): Promise<CrmPipeline> {
  return apiRequest<CrmPipeline>(CRM_ROUTES.pipeline(id), { auth: true, signal });
}

export function createPipeline(body: CreatePipelineRequest): Promise<CrmPipeline> {
  return apiRequest<CrmPipeline>(CRM_ROUTES.pipelines, { method: 'POST', auth: true, body });
}

export function updatePipeline(id: string, body: UpdatePipelineRequest): Promise<CrmPipeline> {
  return apiRequest<CrmPipeline>(CRM_ROUTES.pipeline(id), { method: 'PATCH', auth: true, body });
}

export function deletePipeline(id: string): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.pipeline(id), { method: 'DELETE', auth: true });
}

export function createPipelineStage(
  pipelineId: string,
  body: CreatePipelineStageRequest,
): Promise<CrmPipelineStage> {
  return apiRequest<CrmPipelineStage>(CRM_ROUTES.pipelineStages(pipelineId), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updatePipelineStage(
  pipelineId: string,
  stageId: string,
  body: UpdatePipelineStageRequest,
): Promise<CrmPipelineStage> {
  return apiRequest<CrmPipelineStage>(CRM_ROUTES.pipelineStage(pipelineId, stageId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deletePipelineStage(
  pipelineId: string,
  stageId: string,
  targetStageId?: string,
): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.pipelineStage(pipelineId, stageId), {
    method: 'DELETE',
    auth: true,
    body: targetStageId ? { targetStageId } : {},
  });
}

export function reorderPipelineStages(
  pipelineId: string,
  body: ReorderPipelineStagesRequest,
): Promise<readonly CrmPipelineStage[]> {
  return apiRequest<readonly CrmPipelineStage[]>(CRM_ROUTES.pipelineStageReorder(pipelineId), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function activatePipelineStage(
  pipelineId: string,
  stageId: string,
): Promise<CrmPipelineStage> {
  return apiRequest<CrmPipelineStage>(CRM_ROUTES.pipelineStageActivate(pipelineId, stageId), {
    method: 'POST',
    auth: true,
  });
}

export function deactivatePipelineStage(
  pipelineId: string,
  stageId: string,
  targetStageId?: string,
): Promise<CrmPipelineStage> {
  return apiRequest<CrmPipelineStage>(CRM_ROUTES.pipelineStageDeactivate(pipelineId, stageId), {
    method: 'POST',
    auth: true,
    body: targetStageId ? { targetStageId } : {},
  });
}
