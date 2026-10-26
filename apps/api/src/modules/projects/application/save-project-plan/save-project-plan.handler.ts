import { Inject, Injectable } from '@nestjs/common';
import type { SaveProjectPlanRequest } from '@techwin/validation';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
  type SaveProjectPlanInput,
} from '../../domain/repositories/project.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

function toSaveProjectPlanInput(body: SaveProjectPlanRequest): SaveProjectPlanInput {
  return {
    phases: body.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      description: phase.description,
      startDate: phase.startDate,
      expectedEndDate: phase.expectedEndDate,
      ownerAdminId: phase.ownerAdminId,
      status: phase.status,
      tasks: phase.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigneeAdminId: task.assigneeAdminId,
        startDate: task.startDate,
        dueDate: task.dueDate,
      })),
    })),
  };
}

@Injectable()
export class SaveProjectPlanHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(actor: ProjectActor, projectId: string, body: SaveProjectPlanRequest) {
    return this.repository.saveProjectPlan(
      actor.organizationId,
      projectId,
      toSaveProjectPlanInput(body),
      { adminId: actor.adminId },
    );
  }
}
