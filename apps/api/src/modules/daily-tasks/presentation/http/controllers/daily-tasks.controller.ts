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
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../crm/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { PrismaDailyTaskRepository } from '../../../infrastructure/persistence/prisma-daily-task.repository.js';
import { DailyTaskExceptionFilter } from '../filters/daily-task-exception.filter.js';

function dailyTaskActor(ctx: CrmRequestContext) {
  return { organizationId: ctx.organizationId, adminId: ctx.adminId };
}

@ApiTags('Daily Tasks')
@ApiBearerAuth()
@Controller('daily-tasks')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(DailyTaskExceptionFilter)
export class DailyTasksController {
  constructor(@Inject(PrismaDailyTaskRepository) private readonly repository: PrismaDailyTaskRepository) {}

  @Get('workflow-stages')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily task workflow stages' })
  async listStages(@CrmContext() ctx: CrmRequestContext): Promise<DailyTaskWorkflowStagesResponse> {
    const stages = await this.repository.listWorkflowStages(ctx.organizationId);
    return {
      stages: stages.map((stage) => ({
        id: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        sortOrder: stage.sortOrder,
        colorToken: stage.colorToken,
        isActive: stage.isActive,
        isCompletedStage: stage.isCompletedStage,
      })),
    };
  }

  @Patch('workflow-stages')
  @RequirePermissions('tasks.update')
  @ApiOperation({ summary: 'Update daily task workflow stages' })
  async updateStages(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<DailyTaskWorkflowStagesResponse> {
    const body = updateDailyTaskWorkflowStagesRequestSchema.parse(raw);
    const stages = await this.repository.replaceWorkflowStages(ctx.organizationId, body.stages);
    return {
      stages: stages.map((stage) => ({
        id: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        sortOrder: stage.sortOrder,
        colorToken: stage.colorToken,
        isActive: stage.isActive,
        isCompletedStage: stage.isCompletedStage,
      })),
    };
  }

  @Get('board')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'Daily task board for a date' })
  async board(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskBoardResponse> {
    const query = parseDailyTaskBoardQuery(request.query);
    return this.repository.getBoard(ctx.organizationId, query, query.clientToday);
  }

  @Get('my')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'Tasks assigned to the signed-in employee profile' })
  async myTasks(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskListResponse> {
    const query = parseMyDailyTasksQuery(request.query);
    const clientToday =
      typeof request.query.clientToday === 'string'
        ? request.query.clientToday
        : new Date().toISOString().slice(0, 10);
    const { adminId, organizationId } = dailyTaskActor(ctx);
    return this.repository.listMyTasks(organizationId, adminId, query, clientToday);
  }

  @Get()
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily tasks' })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<DailyTaskListResponse> {
    const query = parseDailyTaskListQuery(request.query);
    const clientToday =
      typeof request.query.clientToday === 'string'
        ? request.query.clientToday
        : new Date().toISOString().slice(0, 10);
    return this.repository.listTasks(ctx.organizationId, query, clientToday);
  }

  @Get(':id')
  @RequirePermissions('tasks.read')
  async get(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<DailyTaskDetail> {
    return this.repository.getTask(ctx.organizationId, id);
  }

  @Post()
  @RequirePermissions('tasks.create')
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: CreateDailyTaskRequest = createDailyTaskRequestSchema.parse(raw);
    const { organizationId, adminId } = dailyTaskActor(ctx);
    return this.repository.createTask(organizationId, adminId, body);
  }

  @Patch(':id')
  @RequirePermissions('tasks.update')
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: UpdateDailyTaskRequest = updateDailyTaskRequestSchema.parse(raw);
    const { organizationId, adminId } = dailyTaskActor(ctx);
    return this.repository.updateTask(organizationId, adminId, id, body);
  }

  @Patch(':id/stage')
  @RequirePermissions('tasks.update')
  async moveStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: MoveDailyTaskStageRequest = moveDailyTaskStageRequestSchema.parse(raw);
    const { organizationId, adminId } = dailyTaskActor(ctx);
    return this.repository.moveTaskStage(organizationId, adminId, id, body);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('tasks.update')
  async reschedule(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: RescheduleDailyTaskRequest = rescheduleDailyTaskRequestSchema.parse(raw);
    const { organizationId, adminId } = dailyTaskActor(ctx);
    return this.repository.rescheduleTask(organizationId, adminId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('tasks.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.repository.deleteTask(ctx.organizationId, id);
  }
}
