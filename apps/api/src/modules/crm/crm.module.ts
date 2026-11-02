import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { ActivatePipelineStageHandler } from './application/activate-pipeline-stage/activate-pipeline-stage.handler.js';
import { BulkDeletePipelinesHandler } from './application/bulk-delete-pipelines/bulk-delete-pipelines.handler.js';
import { BulkUpdatePipelineStatusHandler } from './application/bulk-update-pipeline-status/bulk-update-pipeline-status.handler.js';
import { PipelineBulkActionRunner } from './application/bulk-operations/pipeline-bulk-action.runner.js';
import { ChangeLeadStageHandler } from './application/change-lead-stage/change-lead-stage.handler.js';
import { ChangeProposalStatusHandler } from './application/change-proposal-status/change-proposal-status.handler.js';
import { ChangeServicePackageStatusHandler } from './application/change-service-package-status/change-service-package-status.handler.js';
import { ConvertLeadHandler } from './application/convert-lead/convert-lead.handler.js';
import { CreateClientHandler } from './application/create-client/create-client.handler.js';
import { CreateLeadActivityHandler } from './application/create-lead-activity/create-lead-activity.handler.js';
import { CreateLeadHandler } from './application/create-lead/create-lead.handler.js';
import { CreatePipelineHandler } from './application/create-pipeline/create-pipeline.handler.js';
import { CreatePipelineStageHandler } from './application/create-pipeline-stage/create-pipeline-stage.handler.js';
import { CreateProposalHandler } from './application/create-proposal/create-proposal.handler.js';
import { CreateServicePackageHandler } from './application/create-service-package/create-service-package.handler.js';
import { DeactivatePipelineStageHandler } from './application/deactivate-pipeline-stage/deactivate-pipeline-stage.handler.js';
import { DeleteClientHandler } from './application/delete-client/delete-client.handler.js';
import { DeleteLeadHandler } from './application/delete-lead/delete-lead.handler.js';
import { DeletePipelineHandler } from './application/delete-pipeline/delete-pipeline.handler.js';
import { DeletePipelineStageHandler } from './application/delete-pipeline-stage/delete-pipeline-stage.handler.js';
import { DeleteProposalHandler } from './application/delete-proposal/delete-proposal.handler.js';
import { DeleteServicePackageHandler } from './application/delete-service-package/delete-service-package.handler.js';
import { GetClientHandler } from './application/get-client/get-client.handler.js';
import { GetDefaultPipelineHandler } from './application/get-default-pipeline/get-default-pipeline.handler.js';
import { GetLeadHandler } from './application/get-lead/get-lead.handler.js';
import { GetPipelineHandler } from './application/get-pipeline/get-pipeline.handler.js';
import { GetProposalHandler } from './application/get-proposal/get-proposal.handler.js';
import { GetProposalPrintDataHandler } from './application/get-proposal-print-data/get-proposal-print-data.handler.js';
import { GetServicePackageHandler } from './application/get-service-package/get-service-package.handler.js';
import { ListClientsHandler } from './application/list-clients/list-clients.handler.js';
import { ListLeadActivitiesHandler } from './application/list-lead-activities/list-lead-activities.handler.js';
import { ListLeadsHandler } from './application/list-leads/list-leads.handler.js';
import { ListPipelinesHandler } from './application/list-pipelines/list-pipelines.handler.js';
import { ListProposalsHandler } from './application/list-proposals/list-proposals.handler.js';
import { ListServicePackagesHandler } from './application/list-service-packages/list-service-packages.handler.js';
import { PreviewClientReferenceHandler } from './application/preview-client-reference/preview-client-reference.handler.js';
import { PreviewProposalDocumentNumberHandler } from './application/preview-proposal-document-number/preview-proposal-document-number.handler.js';
import { PreviewServicePackageCodeHandler } from './application/preview-service-package-code/preview-service-package-code.handler.js';
import { ReorderPipelineStagesHandler } from './application/reorder-pipeline-stages/reorder-pipeline-stages.handler.js';
import { UpdateClientHandler } from './application/update-client/update-client.handler.js';
import { UpdateLeadHandler } from './application/update-lead/update-lead.handler.js';
import { UpdatePipelineHandler } from './application/update-pipeline/update-pipeline.handler.js';
import { UpdatePipelineStageHandler } from './application/update-pipeline-stage/update-pipeline-stage.handler.js';
import { UpdatePipelineStatusHandler } from './application/update-pipeline-status/update-pipeline-status.handler.js';
import { UpdateProposalHandler } from './application/update-proposal/update-proposal.handler.js';
import { UpdateServicePackageHandler } from './application/update-service-package/update-service-package.handler.js';
import { CRM_REPOSITORY } from './domain/repositories/crm.repository.js';
import { PrismaCrmRepository } from './infrastructure/persistence/prisma/repositories/prisma-crm.repository.js';
import { ClientsController } from './presentation/http/controllers/clients.controller.js';
import { LeadsController } from './presentation/http/controllers/leads.controller.js';
import { PipelineController } from './presentation/http/controllers/pipeline.controller.js';
import { ProposalsController } from './presentation/http/controllers/proposals.controller.js';
import { ServicePackagesController } from './presentation/http/controllers/service-packages.controller.js';
import { CrmExceptionFilter } from './presentation/http/filters/crm-exception.filter.js';

export const crmPersistenceProviders: Provider[] = [
  { provide: CRM_REPOSITORY, useClass: PrismaCrmRepository },
];

const crmUseCaseHandlers = [
  ActivatePipelineStageHandler,
  BulkDeletePipelinesHandler,
  BulkUpdatePipelineStatusHandler,
  ChangeLeadStageHandler,
  ChangeProposalStatusHandler,
  ChangeServicePackageStatusHandler,
  ConvertLeadHandler,
  CreateClientHandler,
  CreateLeadActivityHandler,
  CreateLeadHandler,
  CreatePipelineHandler,
  CreatePipelineStageHandler,
  CreateProposalHandler,
  CreateServicePackageHandler,
  DeactivatePipelineStageHandler,
  DeleteClientHandler,
  DeleteLeadHandler,
  DeletePipelineHandler,
  DeletePipelineStageHandler,
  DeleteProposalHandler,
  DeleteServicePackageHandler,
  GetClientHandler,
  GetDefaultPipelineHandler,
  GetLeadHandler,
  GetPipelineHandler,
  GetProposalHandler,
  GetProposalPrintDataHandler,
  GetServicePackageHandler,
  ListClientsHandler,
  ListLeadActivitiesHandler,
  ListLeadsHandler,
  ListPipelinesHandler,
  ListProposalsHandler,
  ListServicePackagesHandler,
  PipelineBulkActionRunner,
  PreviewClientReferenceHandler,
  PreviewProposalDocumentNumberHandler,
  PreviewServicePackageCodeHandler,
  ReorderPipelineStagesHandler,
  UpdateClientHandler,
  UpdateLeadHandler,
  UpdatePipelineHandler,
  UpdatePipelineStageHandler,
  UpdatePipelineStatusHandler,
  UpdateProposalHandler,
  UpdateServicePackageHandler,
] as const;

@Module({
  imports: [DatabaseModule, AuthModule, OrgAccessModule],
  controllers: [
    PipelineController,
    LeadsController,
    ClientsController,
    ProposalsController,
    ServicePackagesController,
  ],
  providers: [
    ...crmPersistenceProviders,
    ...crmUseCaseHandlers,
    CrmExceptionFilter,
  ],
  exports: [CRM_REPOSITORY, CrmExceptionFilter],
})
export class CrmModule {}
