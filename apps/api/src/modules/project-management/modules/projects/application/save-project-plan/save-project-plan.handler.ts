import { Inject, Injectable } from '@nestjs/common';
import type { SaveProjectPlanRequest } from '@techwin/validation';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
  type SaveProjectPlanInput,
} from '../../domain/repositories/project.repository.js';
import type { SaveProjectPlanCommand } from './save-project-plan.command.js';

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

  execute(command: SaveProjectPlanCommand) {
    return this.repository.saveProjectPlan(
      command.actor.organizationId,
      command.projectId,
      toSaveProjectPlanInput(command.body),
      { adminId: command.actor.adminId },
    );
  }
}
