import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { OrgAccessModule } from '../org-access/org-access.module.js';
import { BulkDeletePipelinesHandler } from './application/bulk-delete-pipelines/bulk-delete-pipelines.handler.js';
import { BulkUpdatePipelineStatusHandler } from './application/bulk-update-pipeline-status/bulk-update-pipeline-status.handler.js';
import { CrmUseCases } from './application/crm-use-cases.js';
import { DeletePipelineHandler } from './application/delete-pipeline/delete-pipeline.handler.js';
import { PipelineBulkActionRunner } from './application/pipeline-bulk/pipeline-bulk-action.runner.js';
import { UpdatePipelineStatusHandler } from './application/update-pipeline-status/update-pipeline-status.handler.js';
import { CRM_REPOSITORY } from './domain/repositories/crm.repository.js';
import { PrismaCrmRepository } from './infrastructure/persistence/prisma/prisma-crm.repository.js';
import { ClientsController } from './presentation/http/controllers/clients.controller.js';
import { LeadsController } from './presentation/http/controllers/leads.controller.js';
import { PipelineController } from './presentation/http/controllers/pipeline.controller.js';
import { ProposalsController } from './presentation/http/controllers/proposals.controller.js';
import { ServicePackagesController } from './presentation/http/controllers/service-packages.controller.js';
import { CrmExceptionFilter } from './presentation/http/filters/crm-exception.filter.js';
import { CrmOrganizationGuard } from './presentation/http/guards/crm-organization.guard.js';

@Module({
  imports: [DatabaseModule, AuthModule, forwardRef(() => OrgAccessModule)],
  controllers: [
    PipelineController,
    LeadsController,
    ClientsController,
    ProposalsController,
    ServicePackagesController,
  ],
  providers: [
    { provide: CRM_REPOSITORY, useClass: PrismaCrmRepository },
    CrmUseCases,
    PipelineBulkActionRunner,
    UpdatePipelineStatusHandler,
    DeletePipelineHandler,
    BulkUpdatePipelineStatusHandler,
    BulkDeletePipelinesHandler,
    CrmOrganizationGuard,
    CrmExceptionFilter,
  ],
  exports: [CRM_REPOSITORY, CrmOrganizationGuard, CrmExceptionFilter],
})
export class CrmModule {}
