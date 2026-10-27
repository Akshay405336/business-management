import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ClientQuotationListResponse,
  ProjectDetail,
  ProjectListResponse,
  ProjectNumberPreviewResponse,
} from '@techwin/contracts';
import {
  changeProjectStatusRequestSchema,
  createProjectRequestSchema,
  parseProjectListQuery,
  saveProjectPlanRequestSchema,
  updateProjectRequestSchema,
  type CreateProjectRequest,
  type SaveProjectPlanRequest,
  type UpdateProjectRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../crm/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { ChangeProjectStatusHandler } from '../../../application/change-project-status/change-project-status.handler.js';
import { CreateProjectHandler } from '../../../application/create-project/create-project.handler.js';
import { DeleteProjectHandler } from '../../../application/delete-project/delete-project.handler.js';
import { GetProjectHandler } from '../../../application/get-project/get-project.handler.js';
import { ListClientQuotationsHandler } from '../../../application/list-client-quotations/list-client-quotations.handler.js';
import { ListProjectManagersHandler } from '../../../application/list-project-managers/list-project-managers.handler.js';
import { ListProjectsHandler } from '../../../application/list-projects/list-projects.handler.js';
import { PreviewProjectNumberHandler } from '../../../application/preview-project-number/preview-project-number.handler.js';
import { UpdateProjectHandler } from '../../../application/update-project/update-project.handler.js';
import { CompleteProjectHandler } from '../../../application/complete-project/complete-project.handler.js';
import { SaveProjectPlanHandler } from '../../../application/save-project-plan/save-project-plan.handler.js';
import { StartProjectProductionHandler } from '../../../application/start-project-production/start-project-production.handler.js';
import {
  clientQuotationOptionSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  projectManagerOptionSchema,
  projectNumberPreviewResponseSchema,
  toOpenApiSchema,
} from '../dto/project.schemas.js';
import { ProjectExceptionFilter } from '../filters/project-exception.filter.js';
import { toProjectActor } from '../mappers/project-actor.mapper.js';
import {
  toClientQuotationListResponse,
  toProjectDetail,
  toProjectListItem,
  toProjectManagerOption,
} from '../mappers/project-response.mapper.js';
import {
  toCreateProjectInput,
  toUpdateProjectInput,
} from '../mappers/project-request.mapper.js';

const projectManagersResponseSchema = z.object({
  managers: z.array(projectManagerOptionSchema),
});

const clientQuotationsResponseSchema = z.object({
  quotations: z.array(clientQuotationOptionSchema),
});

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(ProjectExceptionFilter)
export class ProjectsController {
  constructor(
    @Inject(ListProjectsHandler) private readonly listProjects: ListProjectsHandler,
    @Inject(GetProjectHandler) private readonly getProject: GetProjectHandler,
    @Inject(CreateProjectHandler) private readonly createProject: CreateProjectHandler,
    @Inject(UpdateProjectHandler) private readonly updateProject: UpdateProjectHandler,
    @Inject(ChangeProjectStatusHandler)
    private readonly changeProjectStatus: ChangeProjectStatusHandler,
    @Inject(DeleteProjectHandler) private readonly deleteProject: DeleteProjectHandler,
    @Inject(PreviewProjectNumberHandler)
    private readonly previewProjectNumber: PreviewProjectNumberHandler,
    @Inject(ListProjectManagersHandler)
    private readonly listProjectManagers: ListProjectManagersHandler,
    @Inject(ListClientQuotationsHandler)
    private readonly listClientQuotationsHandler: ListClientQuotationsHandler,
    @Inject(SaveProjectPlanHandler) private readonly saveProjectPlan: SaveProjectPlanHandler,
    @Inject(StartProjectProductionHandler)
    private readonly startProjectProduction: StartProjectProductionHandler,
    @Inject(CompleteProjectHandler) private readonly completeProject: CompleteProjectHandler,
  ) {}

  @RequirePermissions('projects.read')
  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<ProjectListResponse> {
    const listQuery = parseProjectListQuery(request.query);
    const result = await this.listProjects.execute({ actor: toProjectActor(ctx), listQuery });
    return {
      items: result.items.map(toProjectListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      tabCounts: result.tabCounts,
    };
  }

  @RequirePermissions('projects.read')
  @Get('number-preview')
  @ApiOperation({ summary: 'Preview next project number' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectNumberPreviewResponseSchema) })
  async previewNumber(@CrmContext() ctx: CrmRequestContext): Promise<ProjectNumberPreviewResponse> {
    const result = await this.previewProjectNumber.execute({ actor: toProjectActor(ctx) });
    return { projectNumber: result.projectNumber, isPreview: true };
  }

  @RequirePermissions('projects.read')
  @Get('managers')
  @ApiOperation({ summary: 'List project managers' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectManagersResponseSchema) })
  async listManagers(@CrmContext() ctx: CrmRequestContext) {
    const result = await this.listProjectManagers.execute({ actor: toProjectActor(ctx) });
    return { managers: result.managers.map(toProjectManagerOption) };
  }

  @RequirePermissions('projects.read')
  @Get('clients/:clientId/quotations')
  @ApiOperation({ summary: 'List quotations for a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(clientQuotationsResponseSchema) })
  async listClientQuotations(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
  ): Promise<ClientQuotationListResponse> {
    const result = await this.listClientQuotationsHandler.execute({
      actor: toProjectActor(ctx),
      clientId,
    });
    return toClientQuotationListResponse(result.quotations);
  }

  @RequirePermissions('projects.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get project' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async get(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<ProjectDetail> {
    const project = await this.getProject.execute({
      actor: toProjectActor(ctx),
      projectId: id,
    });
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.create')
  @Post()
  @ApiOperation({ summary: 'Create project' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<ProjectDetail> {
    const body: CreateProjectRequest = createProjectRequestSchema.parse(raw);
    const project = await this.createProject.execute({
      actor: toProjectActor(ctx),
      input: toCreateProjectInput(body, ctx.adminId),
    });
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<ProjectDetail> {
    const body: UpdateProjectRequest = updateProjectRequestSchema.parse(raw);
    const project = await this.updateProject.execute({
      actor: toProjectActor(ctx),
      projectId: id,
      input: toUpdateProjectInput(body),
    });
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.update')
  @Post(':id/plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save project execution plan' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async savePlan(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<ProjectDetail> {
    const body: SaveProjectPlanRequest = saveProjectPlanRequestSchema.parse(raw);
    const project = await this.saveProjectPlan.execute(toProjectActor(ctx), id, body);
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.update')
  @Post(':id/start-production')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start project production' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async startProduction(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<ProjectDetail> {
    const project = await this.startProjectProduction.execute(toProjectActor(ctx), id);
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.update')
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete project' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async complete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<ProjectDetail> {
    const project = await this.completeProject.execute(toProjectActor(ctx), id);
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.update')
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change project status' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectDetailResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ProjectDetail> {
    const parsed = changeProjectStatusRequestSchema.parse(body);
    const project = await this.changeProjectStatus.execute({
      actor: toProjectActor(ctx),
      projectId: id,
      status: parsed.status,
    });
    return toProjectDetail(project);
  }

  @RequirePermissions('projects.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  async remove(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteProject.execute({ actor: toProjectActor(ctx), projectId: id });
  }
}
