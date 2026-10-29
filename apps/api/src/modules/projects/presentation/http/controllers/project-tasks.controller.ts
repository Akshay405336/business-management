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
  ProjectTask,
  ProjectTaskBoardResponse,
  ProjectTaskSummaryListResponse,
} from '@techwin/contracts';
import {
  createProjectTaskRequestSchema,
  moveProjectTaskRequestSchema,
  parseProjectListQuery,
  reorderProjectPhasesRequestSchema,
  updateProjectTaskRequestSchema,
  type CreateProjectTaskRequest,
  type MoveProjectTaskRequest,
  type ReorderProjectPhasesRequest,
  type UpdateProjectTaskRequest,
} from '@techwin/validation';
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
import { CreateProjectTaskHandler } from '../../../application/create-project-task/create-project-task.handler.js';
import { DeleteProjectTaskHandler } from '../../../application/delete-project-task/delete-project-task.handler.js';
import { GetProjectTaskBoardHandler } from '../../../application/get-project-task-board/get-project-task-board.handler.js';
import { ListProjectTaskSummariesHandler } from '../../../application/list-project-task-summaries/list-project-task-summaries.handler.js';
import { MoveProjectTaskHandler } from '../../../application/move-project-task/move-project-task.handler.js';
import { ReorderProjectPhasesHandler } from '../../../application/reorder-project-phases/reorder-project-phases.handler.js';
import { UpdateProjectTaskHandler } from '../../../application/update-project-task/update-project-task.handler.js';
import { ProjectExceptionFilter } from '../filters/project-exception.filter.js';
import { toProjectActor } from '../mappers/project-actor.mapper.js';
import {
  toProjectTask,
  toProjectTaskBoardResponse,
  toProjectTaskSummaryListResponse,
} from '../mappers/project-task-response.mapper.js';
import {
  toOpenApiSchema,
  projectTaskBoardResponseSchema,
  projectTaskSummaryListResponseSchema,
} from '../dto/project-task.schemas.js';

@ApiTags('Project Tasks')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(ProjectExceptionFilter)
@Controller('project-tasks')
export class ProjectTasksController {
  constructor(
    @Inject(ListProjectTaskSummariesHandler)
    private readonly listSummaries: ListProjectTaskSummariesHandler,
    @Inject(GetProjectTaskBoardHandler) private readonly getBoard: GetProjectTaskBoardHandler,
    @Inject(CreateProjectTaskHandler) private readonly createTask: CreateProjectTaskHandler,
    @Inject(UpdateProjectTaskHandler) private readonly updateTask: UpdateProjectTaskHandler,
    @Inject(MoveProjectTaskHandler) private readonly moveTask: MoveProjectTaskHandler,
    @Inject(DeleteProjectTaskHandler) private readonly deleteTask: DeleteProjectTaskHandler,
    @Inject(ReorderProjectPhasesHandler)
    private readonly reorderPhases: ReorderProjectPhasesHandler,
  ) {}

  @RequirePermissions('tasks.read')
  @Get('projects')
  @ApiOperation({ summary: 'List projects for task management' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectTaskSummaryListResponseSchema) })
  async listProjects(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<ProjectTaskSummaryListResponse> {
    const listQuery = parseProjectListQuery(request.query);
    const result = await this.listSummaries.execute({
      actor: toProjectActor(ctx),
      listQuery,
    });
    return toProjectTaskSummaryListResponse(result);
  }

  @RequirePermissions('tasks.read')
  @Get('projects/:projectId/board')
  @ApiOperation({ summary: 'Get project task board' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectTaskBoardResponseSchema) })
  async getProjectBoard(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
  ): Promise<ProjectTaskBoardResponse> {
    const board = await this.getBoard.execute({
      actor: toProjectActor(ctx),
      projectId,
    });
    return toProjectTaskBoardResponse(board);
  }

  @RequirePermissions('tasks.update')
  @Post('projects/:projectId/phases/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder project plan phases' })
  @ApiOkResponse({ schema: toOpenApiSchema(projectTaskBoardResponseSchema) })
  async reorderProjectPhases(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
    @Body() raw: unknown,
  ): Promise<ProjectTaskBoardResponse> {
    const body: ReorderProjectPhasesRequest = reorderProjectPhasesRequestSchema.parse(raw);
    const board = await this.reorderPhases.execute(toProjectActor(ctx), projectId, body);
    return toProjectTaskBoardResponse(board);
  }

  @RequirePermissions('tasks.update')
  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create project task' })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
    @Body() raw: unknown,
  ): Promise<ProjectTask> {
    const body: CreateProjectTaskRequest = createProjectTaskRequestSchema.parse(raw);
    const task = await this.createTask.execute(toProjectActor(ctx), projectId, body);
    return toProjectTask(task);
  }

  @RequirePermissions('tasks.update')
  @Patch('projects/:projectId/tasks/:taskId')
  @ApiOperation({ summary: 'Update project task' })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() raw: unknown,
  ): Promise<ProjectTask> {
    const body: UpdateProjectTaskRequest = updateProjectTaskRequestSchema.parse(raw);
    const task = await this.updateTask.execute(toProjectActor(ctx), projectId, taskId, body);
    return toProjectTask(task);
  }

  @RequirePermissions('tasks.update')
  @Patch('projects/:projectId/tasks/:taskId/move')
  @ApiOperation({ summary: 'Move or reorder project task' })
  async move(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() raw: unknown,
  ): Promise<ProjectTask> {
    const body: MoveProjectTaskRequest = moveProjectTaskRequestSchema.parse(raw);
    const task = await this.moveTask.execute(toProjectActor(ctx), projectId, taskId, body);
    return toProjectTask(task);
  }

  @RequirePermissions('tasks.delete')
  @Delete('projects/:projectId/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project task' })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<void> {
    await this.deleteTask.execute(toProjectActor(ctx), projectId, taskId);
  }
}
