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
  DailyTaskNotesResponse,
  DailyTaskNoteItem,
  DailyTaskWorkflowStagesResponse,
} from '@techwin/contracts';
import {
  createDailyTaskRequestSchema,
  moveDailyTaskStageRequestSchema,
  parseDailyTaskBoardQuery,
  parseDailyTaskListQuery,
  parseMyDailyTasksQuery,
  addDailyTaskCommentRequestSchema,
  createDailyTaskNoteRequestSchema,
  rescheduleDailyTaskRequestSchema,
  updateDailyTaskRequestSchema,
  updateDailyTaskWorkflowStagesRequestSchema,
  type AddDailyTaskCommentRequest,
  type CreateDailyTaskRequest,
  type MoveDailyTaskStageRequest,
  type RescheduleDailyTaskRequest,
  type UpdateDailyTaskRequest,
} from '@techwin/validation';
import type { DailyTaskActivitiesResponse } from '@techwin/contracts';
import { PlatformAdminGuard, type PlatformAuthenticatedRequest } from '../../../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../../../platform/tenant-context/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
  toOrgAccessActor,
} from '../../../../../../org-access/index.js';
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
import { AddDailyTaskCommentHandler } from '../../../application/add-daily-task-comment/add-daily-task-comment.handler.js';
import { AcknowledgeDailyTaskNoteHandler } from '../../../application/acknowledge-daily-task-note/acknowledge-daily-task-note.handler.js';
import { CreateDailyTaskNoteHandler } from '../../../application/create-daily-task-note/create-daily-task-note.handler.js';
import { ListDailyTaskActivitiesHandler } from '../../../application/list-daily-task-activities/list-daily-task-activities.handler.js';
import { ListDailyTaskNotesHandler } from '../../../application/list-daily-task-notes/list-daily-task-notes.handler.js';
import { DailyTaskAuthorizationService } from '../../../application/services/daily-task-authorization.service.js';
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
    @Inject(ListDailyTaskActivitiesHandler)
    private readonly listActivities: ListDailyTaskActivitiesHandler,
    @Inject(AddDailyTaskCommentHandler) private readonly addComment: AddDailyTaskCommentHandler,
    @Inject(CreateDailyTaskNoteHandler) private readonly createTaskNote: CreateDailyTaskNoteHandler,
    @Inject(ListDailyTaskNotesHandler) private readonly listTaskNotes: ListDailyTaskNotesHandler,
    @Inject(AcknowledgeDailyTaskNoteHandler)
    private readonly acknowledgeTaskNote: AcknowledgeDailyTaskNoteHandler,
    @Inject(DailyTaskAuthorizationService) private readonly dailyTaskAuthz: DailyTaskAuthorizationService,
  ) {}

  private accessActor(
    ctx: CrmRequestContext,
    request: PlatformAuthenticatedRequest,
  ) {
    return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
  }

  @Get('workflow-stages')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily task workflow stages' })
  async listStages(@CrmContext() ctx: CrmRequestContext): Promise<DailyTaskWorkflowStagesResponse> {
    const stages = await this.listWorkflowStages.execute({ actor: toDailyTaskActor(ctx) });
    return toDailyTaskWorkflowStagesResponse(stages);
  }

  @Patch('workflow-stages')
  @RequirePermissions('tasks.update', 'daily_tasks.manage_workflow')
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
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<DailyTaskBoardResponse> {
    const query = parseDailyTaskBoardQuery(request.query);
    return this.getBoard.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      query,
    });
  }

  @Get('my')
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'Tasks assigned to the signed-in employee profile' })
  async myTasks(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<DailyTaskListResponse> {
    const query = parseMyDailyTasksQuery(request.query);
    return this.listMyTasks.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      query,
      clientToday: resolveClientToday(request),
    });
  }

  @Get()
  @RequirePermissions('tasks.read')
  @ApiOperation({ summary: 'List daily tasks' })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<DailyTaskListResponse> {
    const listQuery = parseDailyTaskListQuery(request.query);
    return this.listTasks.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      query: toDailyTaskListQuery(listQuery),
      clientToday: resolveClientToday(request),
    });
  }

  @Get(':id/notes')
  @RequirePermissions('tasks.read')
  async notes(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DailyTaskNotesResponse> {
    const items = await this.listTaskNotes.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
    });
    return { items };
  }

  @Post(':id/notes')
  @RequirePermissions(
    'tasks.read',
    'daily_tasks.notes.create',
    'daily_tasks.comment',
    'tasks.comment',
  )
  async createNote(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskNoteItem> {
    const body = createDailyTaskNoteRequestSchema.parse(raw);
    return this.createTaskNote.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
      input: body,
    });
  }

  @Patch(':id/notes/:noteId/acknowledge')
  @RequirePermissions('tasks.read', 'daily_tasks.notes.acknowledge', 'tasks.update')
  async acknowledgeNote(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ): Promise<DailyTaskNoteItem> {
    return this.acknowledgeTaskNote.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
      noteId,
    });
  }

  @Get(':id/activities')
  @RequirePermissions('tasks.read')
  async activities(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DailyTaskActivitiesResponse> {
    const items = await this.listActivities.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
    });
    return { items };
  }

  @Post(':id/comments')
  @RequirePermissions(
    'tasks.read',
    'daily_tasks.comment',
    'tasks.comment',
    'tasks.update',
  )
  async comment(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: AddDailyTaskCommentRequest = addDailyTaskCommentRequestSchema.parse(raw);
    const accessActor = this.accessActor(ctx, request);
    const effective = await this.dailyTaskAuthz.resolveEffective(accessActor);
    const scope =
      body.scope ??
      (this.dailyTaskAuthz.canManageOrganizationTasks(accessActor, effective) ||
      effective.has('tasks.update')
        ? 'admin'
        : 'employee');
    return this.addComment.execute({
      actor: toDailyTaskActor(ctx),
      accessActor,
      taskId: id,
      input: { text: body.text, scope },
    });
  }

  @Get(':id')
  @RequirePermissions('tasks.read')
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DailyTaskDetail> {
    return this.getTask.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
    });
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
  @RequirePermissions('tasks.update', 'daily_tasks.update_status', 'tasks.progress')
  async moveStage(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: MoveDailyTaskStageRequest = moveDailyTaskStageRequestSchema.parse(raw);
    return this.moveTaskStage.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
      input: body,
    });
  }

  @Patch(':id/reschedule')
  @RequirePermissions('tasks.update')
  async reschedule(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<DailyTaskDetail> {
    const body: RescheduleDailyTaskRequest = rescheduleDailyTaskRequestSchema.parse(raw);
    return this.rescheduleTask.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
      input: body,
    });
  }

  @Delete(':id')
  @RequirePermissions('tasks.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteTask.execute({
      actor: toDailyTaskActor(ctx),
      accessActor: this.accessActor(ctx, request),
      taskId: id,
    });
  }
}
