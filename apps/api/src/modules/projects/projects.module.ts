import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { ChangeProjectStatusHandler } from './application/change-project-status/change-project-status.handler.js';
import { CreateProjectHandler } from './application/create-project/create-project.handler.js';
import { DeleteProjectHandler } from './application/delete-project/delete-project.handler.js';
import { GetProjectHandler } from './application/get-project/get-project.handler.js';
import { ListClientQuotationsHandler } from './application/list-client-quotations/list-client-quotations.handler.js';
import { ListProjectManagersHandler } from './application/list-project-managers/list-project-managers.handler.js';
import { ListProjectsHandler } from './application/list-projects/list-projects.handler.js';
import { PreviewProjectNumberHandler } from './application/preview-project-number/preview-project-number.handler.js';
import { UpdateProjectHandler } from './application/update-project/update-project.handler.js';
import { CreateProjectTaskHandler } from './application/create-project-task/create-project-task.handler.js';
import { DeleteProjectTaskHandler } from './application/delete-project-task/delete-project-task.handler.js';
import { GetProjectTaskBoardHandler } from './application/get-project-task-board/get-project-task-board.handler.js';
import { ListProjectTaskSummariesHandler } from './application/list-project-task-summaries/list-project-task-summaries.handler.js';
import { MoveProjectTaskHandler } from './application/move-project-task/move-project-task.handler.js';
import { UpdateProjectTaskHandler } from './application/update-project-task/update-project-task.handler.js';
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository.js';
import { PROJECT_TASK_REPOSITORY } from './domain/repositories/project-task.repository.js';
import { PrismaProjectRepository } from './infrastructure/persistence/prisma/prisma-project.repository.js';
import { PrismaProjectTaskRepository } from './infrastructure/persistence/prisma/prisma-project-task.repository.js';
import { ProjectTasksController } from './presentation/http/controllers/project-tasks.controller.js';
import { ProjectsController } from './presentation/http/controllers/projects.controller.js';
import { ProjectExceptionFilter } from './presentation/http/filters/project-exception.filter.js';

export const projectPersistenceProviders: Provider[] = [
  { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
  { provide: PROJECT_TASK_REPOSITORY, useClass: PrismaProjectTaskRepository },
];

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule],
  controllers: [ProjectsController, ProjectTasksController],
  providers: [
    ...projectPersistenceProviders,
    ListProjectTaskSummariesHandler,
    GetProjectTaskBoardHandler,
    CreateProjectTaskHandler,
    UpdateProjectTaskHandler,
    MoveProjectTaskHandler,
    DeleteProjectTaskHandler,
    ListProjectsHandler,
    GetProjectHandler,
    CreateProjectHandler,
    UpdateProjectHandler,
    ChangeProjectStatusHandler,
    DeleteProjectHandler,
    PreviewProjectNumberHandler,
    ListProjectManagersHandler,
    ListClientQuotationsHandler,
    ProjectExceptionFilter,
  ],
})
export class ProjectsModule {}
