import { Inject, Injectable } from '@nestjs/common';
import type { TaskCalendarFiltersResponse } from '@techwin/contracts';
import { DailyTaskAuthorizationService } from '../../../daily-tasks/application/services/daily-task-authorization.service.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../../daily-tasks/domain/repositories/daily-task.repository.js';
import { EMPLOYEE_REPOSITORY, type EmployeeRepository } from '../../../../../employees/index.js';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../../projects/domain/repositories/project.repository.js';
import type { ListCalendarFiltersQuery } from './list-calendar-filters.query.js';

@Injectable()
export class ListCalendarFiltersHandler {
  constructor(
    @Inject(DailyTaskAuthorizationService) private readonly dailyTaskAuthz: DailyTaskAuthorizationService,
    @Inject(DAILY_TASK_REPOSITORY) private readonly dailyTasks: DailyTaskRepository,
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
  ) {}

  async execute(input: ListCalendarFiltersQuery): Promise<TaskCalendarFiltersResponse> {
    const effective = await this.dailyTaskAuthz.resolveEffective(input.accessActor);
    const orgWide = this.dailyTaskAuthz.canManageOrganizationTasks(input.accessActor, effective);

    const stages = await this.dailyTasks.listWorkflowStages(input.organizationId);
    const empPage = orgWide
      ? await this.employees.listEmployees(input.organizationId, {
          page: 1,
          pageSize: 500,
          sortBy: 'displayName',
          sortDir: 'asc',
        })
      : { items: [] as const };
    const projPage = orgWide
      ? await this.projects.listProjects(input.organizationId, {
          page: 1,
          pageSize: 200,
        })
      : { items: [] as const };

    return {
      employees: empPage.items.map((e) => ({ id: e.id, label: e.displayName })),
      projects: projPage.items.map((p) => ({
        id: p.id,
        label: p.name ? `${p.projectNumber} — ${p.name}` : p.projectNumber,
      })),
      taskTypes: [
        { value: 'GENERAL', label: 'General' },
        { value: 'PROJECT', label: 'Project (daily)' },
        { value: 'PROJECT_PLAN', label: 'Project plan' },
      ],
      priorities: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
      ],
      dailyStatuses: stages.map((s) => ({ value: s.stageKey, label: s.name })),
      projectTaskStatuses: [
        { value: 'TODO', label: 'To do' },
        { value: 'IN_PROGRESS', label: 'In progress' },
        { value: 'IN_REVIEW', label: 'Review' },
        { value: 'COMPLETED', label: 'Completed' },
      ],
      sources: [
        { value: 'DAILY_TASK', label: 'Daily tasks' },
        { value: 'PROJECT_TASK', label: 'Project tasks' },
      ],
    };
  }
}
