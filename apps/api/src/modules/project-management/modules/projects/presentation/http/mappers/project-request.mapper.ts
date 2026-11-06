import type { CreateProjectRequest, UpdateProjectRequest } from '@techwin/validation';
import type { CreateProjectInput, UpdateProjectInput } from '../../../domain/repositories/project.repository.js';

export function toCreateProjectInput(
  body: CreateProjectRequest,
  createdByAdminId: string,
): CreateProjectInput {
  return {
    name: body.name,
    priority: body.priority,
    projectManagerAdminId: body.projectManagerAdminId ?? null,
    startDate: body.startDate,
    expectedEndDate: body.expectedEndDate,
    description: body.description,
    clientId: body.clientId,
    proposalId: body.proposalId ?? null,
    acceptedCommercialValue: body.acceptedCommercialValue ?? null,
    scopeAndRequirements: body.scopeAndRequirements,
    phases: body.phases,
    createdByAdminId,
  };
}

export function toUpdateProjectInput(body: UpdateProjectRequest): UpdateProjectInput {
  return {
    name: body.name,
    priority: body.priority,
    projectManagerAdminId: body.projectManagerAdminId,
    startDate: body.startDate,
    expectedEndDate: body.expectedEndDate,
    description: body.description,
    clientId: body.clientId,
    proposalId: body.proposalId,
    acceptedCommercialValue: body.acceptedCommercialValue,
    scopeAndRequirements: body.scopeAndRequirements,
    phases: body.phases,
  };
}
