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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  DailyTaskBoardResponse,
  DailyTaskDetail,
  DailyTaskListResponse,
  DailyTaskWorkflowStagesResponse,
} from '@techwin/contracts';
import {
  createDailyTaskRequestSchema,
  moveDailyTaskStageRequestSchema,
  parseDailyTaskBoardQuery,
  parseDailyTaskListQuery,
  parseMyDailyTasksQuery,
  rescheduleDailyTaskRequestSchema,
  updateDailyTaskRequestSchema,
  updateDailyTaskWorkflowStagesRequestSchema,
  type CreateDailyTaskRequest,
  type MoveDailyTaskStageRequest,
  type RescheduleDailyTaskRequest,
  type UpdateDailyTaskRequest,
} from '@techwin/validation';
import { PlatformAdminGuard, type PlatformAuthenticatedRequest } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
  toOrgAccessActor,
} from '../../../../org-access/index.js';
import { CreateDailyTaskHandler } from '../../../application/create-daily-task/create-daily-task.handler.js';
import { DeleteDailyTaskHandler } from '../../../application/delete-daily-task/delete-daily-task.handler.js';
import { GetDailyTaskBoardHandler } from '../../../application/get-daily-task-board/get-daily-task-board.handler.js';
import { GetDailyTaskHandler } from '../../../application/get-daily-task/get-daily-task.handler.js';
import { ListDailyTasksHandler } from '../../../application/list-daily-tasks/list-daily-tasks.handler.js';
import { ListMyDailyTasksHandler } from '../../../application/list-my-daily-tasks/list-my-daily-tasks.handler.js';
import { ListWorkflowStagesHandler } from '../../../application/list-workflow-stages/list-workflow-stages.handler.js';
import { MoveDailyTaskStageHandler } from '../../../application/move-daily-task-stage/move-daily-task-stage.handler.js';
import { RescheduleDailyTaskHandler } from '../../../application/reschedule-daily-task/reschedule-daily-task.handler.js';
import { UpdateDailyTaskHandler } from '../../../application/update-daily-task/update-daily-task.handler.js';
import { UpdateWorkflowStagesHandler } from '../../../application/update-workflow-stages/update-workflow-stages.handler.js';
import { toDailyTaskListQuery } from '../../../application/shared/daily-task-list-query.js';
import { DailyTaskExceptionFilter } from '../filters/daily-task-exception.filter.js';
import { toDailyTaskActor } from '../mappers/daily-task-actor.mapper.js';
import { toDailyTaskWorkflowStagesResponse } from '../mappers/daily-task-response.mapper.js';

function resolveClientToday(request: Request): string {
  return typeof request.query.clientToday === 'string'
    ? request.query.clientToday
    : new Date().toISOString().slice(0, 10);
}

@ApiTags('Daily Tasks')
@ApiBearerAuth()
@Controller('daily-tasks')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(DailyTaskExceptionFilter)
export class DailyTasksController {
  constructor(
    @Inject(ListWorkflowStagesHandler)
    private readonly listWorkflowStages: ListWorkflowStagesHandler,
    @Inject(UpdateWorkflowStagesHandler)
    private readonly updateWorkflowStages: UpdateWorkflowStagesHandler,
    @Inject(GetDailyTaskBoardHandler) private readonly getBoard: GetDailyTaskBoardHandler,
    @Inject(ListMyDailyTasksHandler) private readonly listMyTasks: ListMyDailyTasksHandler,
    @Inject(ListDailyTasksHandler) private readonly listTasks: ListDailyTasksHandler,
    @Inject(GetDailyTaskHandler) private readonly getTask: GetDailyTaskHandler,
    @Inject(CreateDailyTaskHandler) private readonly createTask: CreateDailyTaskHandler,
    @Inject(UpdateDailyTaskHandler) private readonly updateTask: UpdateDailyTaskHandler,
    @Inject(MoveDailyTaskStageHandler) private readonly moveTaskStage: MoveDailyTaskStageHandler,
    @Inject(RescheduleDailyTaskHandler) private readonly rescheduleTask: RescheduleDailyTaskHandler,
    @Inject(DeleteDailyTaskHandler) private readonly deleteTask: DeleteDailyTaskHandler,
  ) {}

  @Get('workflow-stages')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily task workflow stages' })
  async listStages(@CrmContext() ctx: CrmRequestContext): Promise<DailyTaskWorkflowStagesResponse> {
    const stages = await this.listWorkflowStages.execute({ actor: toDailyTaskActor(ctx) });
    return toDailyTaskWorkflowStagesResponse(stages);
  }

  @Patch('workflow-stages')
  @RequirePermissions('tasks.update')
  @ApiOperation({ summary: 'Update daily task workflow stages' })
  async updateStages(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<DailyTaskWorkflowStagesResponse> {
    const body = updateDailyTaskWorkflowStagesRequestSchema.parse(raw);
    const stages = await this.updateWorkflowStages.execute({
      actor: toDailyTaskActor(ctx),
      stages: body.stages,
    });
    return toDailyTaskWorkflowStagesResponse(stages);
  }

  @Get('board')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'Daily task board for a date' })
  async board(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskBoardResponse> {
    const query = parseDailyTaskBoardQuery(request.query);
    return this.getBoard.execute({
      actor: toDailyTaskActor(ctx),
      query,
    });
  }

  @Get('my')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'Tasks assigned to the signed-in employee profile' })
  async myTasks(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskListResponse> {
    const query = parseMyDailyTasksQuery(request.query);
    return this.listMyTasks.execute({
      actor: toDailyTaskActor(ctx),
      query,
      clientToday: resolveClientToday(request),
    });
  }

  @Get()
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily tasks' })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskListResponse> {
    const listQuery = parseDailyTaskListQuery(request.query);
    return this.listTasks.execute({
      actor: toDailyTaskActor(ctx),
      query: toDailyTaskListQuery(listQuery),
      clientToday: resolveClientToday(request),
    });
  }

  @Get(':id')
  @RequirePermissions('tasks.read')
  async get(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<DailyTaskDetail> {
    return this.getTask.execute({ actor: toDailyTaskActor(ctx), taskId: id });
  }

  @Post()
  @RequirePermissions('tasks.create')
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: CreateDailyTaskRequest = createDailyTaskRequestSchema.parse(raw);
    return this.createTask.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN'),
      input: body,
    });
  }

  @Patch(':id')
  @RequirePermissions('tasks.update')
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: UpdateDailyTaskRequest = updateDailyTaskRequestSchema.parse(raw);
    return this.updateTask.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN'),
      taskId: id,
      input: body,
    });
  }

  @Patch(':id/stage')
  @RequirePermissions('tasks.update')
  async moveStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: MoveDailyTaskStageRequest = moveDailyTaskStageRequestSchema.parse(raw);
    return this.moveTaskStage.execute({
      actor: toDailyTaskActor(ctx),
      taskId: id,
      input: body,
    });
  }

  @Patch(':id/reschedule')
  @RequirePermissions('tasks.update')
  async reschedule(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: RescheduleDailyTaskRequest = rescheduleDailyTaskRequestSchema.parse(raw);
    return this.rescheduleTask.execute({
      actor: toDailyTaskActor(ctx),
      taskId: id,
      input: body,
    });
  }

  @Delete(':id')
  @RequirePermissions('tasks.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteTask.execute({ actor: toDailyTaskActor(ctx), taskId: id });
  }
}
