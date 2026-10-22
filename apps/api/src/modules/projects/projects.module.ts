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
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository.js';
import { PrismaProjectRepository } from './infrastructure/persistence/prisma/prisma-project.repository.js';
import { ProjectsController } from './presentation/http/controllers/projects.controller.js';
import { ProjectExceptionFilter } from './presentation/http/filters/project-exception.filter.js';

export const projectPersistenceProviders: Provider[] = [
  { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
];

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule],
  controllers: [ProjectsController],
  providers: [
    ...projectPersistenceProviders,
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
