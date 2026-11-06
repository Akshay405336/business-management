import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TaskCalendarFiltersResponse, TaskCalendarResponse } from '@techwin/contracts';
import { parseTaskCalendarApiQuery } from '@techwin/validation';
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
import { ListCalendarFiltersHandler } from '../../../application/list-calendar-filters/list-calendar-filters.handler.js';
import { ListCalendarTasksHandler } from '../../../application/list-calendar-tasks/list-calendar-tasks.handler.js';

function resolveClientToday(request: Request): string {
  return typeof request.query.clientToday === 'string'
    ? request.query.clientToday
    : new Date().toISOString().slice(0, 10);
}

@ApiTags('Task Calendar')
@ApiBearerAuth()
@Controller('project-management/task-calendar')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
export class TaskCalendarController {
  constructor(
    @Inject(ListCalendarTasksHandler)
    private readonly listCalendarTasks: ListCalendarTasksHandler,
    @Inject(ListCalendarFiltersHandler)
    private readonly listCalendarFilters: ListCalendarFiltersHandler,
  ) {}

  @Get()
  @RequirePermissions('tasks.read', 'projects.read')
  @ApiOperation({
    summary: 'Organization task calendar — daily tasks and project plan tasks (grouped by day)',
  })
  async listCalendar(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<TaskCalendarResponse> {
    const query = parseTaskCalendarApiQuery(request.query);
    const accessActor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.listCalendarTasks.execute({
      organizationId: ctx.organizationId,
      clientToday: resolveClientToday(request),
      accessActor,
      query,
    });
  }

  @Get('filters')
  @RequirePermissions('tasks.read', 'projects.read')
  @ApiOperation({ summary: 'Filter options for task calendar (employees, projects, statuses)' })
  async listFilters(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<TaskCalendarFiltersResponse> {
    const accessActor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    return this.listCalendarFilters.execute({
      organizationId: ctx.organizationId,
      accessActor,
    });
  }
}
