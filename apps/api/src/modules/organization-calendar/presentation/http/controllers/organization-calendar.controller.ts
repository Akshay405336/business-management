import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { PlatformAuthenticatedRequest } from '../../../../auth/index.js';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  OrgCalendarEventItem,
  OrgCalendarEventListResponse,
  OrgCalendarMonthResponse,
} from '@techwin/contracts';
import {
  createOrgCalendarEventRequestSchema,
  duplicateOrgCalendarHolidaysRequestSchema,
  parseOrgCalendarHolidaysQuery,
  parseOrgCalendarListQuery,
  parseOrgCalendarMonthQuery,
  updateOrgCalendarEventRequestSchema,
} from '@techwin/validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import {
  RequirePermissionsGuard,
  toOrgAccessActor,
} from '../../../../org-access/index.js';
import {
  ClassifyOrgCalendarDateHandler,
  CreateOrgCalendarEventHandler,
  DeleteOrgCalendarEventHandler,
  DuplicateOrgCalendarHolidaysHandler,
  ExportOrgCalendarHandler,
  GetEmployeeOrgCalendarMonthHandler,
  GetOrgCalendarEventHandler,
  GetOrgCalendarMonthHandler,
  ListOrgCalendarEventsHandler,
  ListOrgCalendarHolidaysHandler,
  UpdateOrgCalendarEventHandler,
} from '../../../application/org-calendar.handlers.js';
import { OrgCalendarExceptionFilter } from '../filters/org-calendar-exception.filter.js';
import type { OrgCalendarEventWriteInput } from '../../../domain/types/org-calendar.types.js';

function toEventWriteInput(body: {
  title: string;
  description: string;
  eventType: OrgCalendarEventWriteInput['eventType'];
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  startTimeMinutes?: number | null;
  endTimeMinutes?: number | null;
  color: string;
  isActive: boolean;
  appliesToAllEmployees: boolean;
  employeeIds: string[];
  recurrence: OrgCalendarEventWriteInput['recurrence'];
}): OrgCalendarEventWriteInput {
  return {
    ...body,
    startTimeMinutes: body.isFullDay ? null : (body.startTimeMinutes ?? null),
    endTimeMinutes: body.isFullDay ? null : (body.endTimeMinutes ?? null),
  };
}

function actorFrom(
  ctx: CrmRequestContext,
  request: PlatformAuthenticatedRequest,
) {
  return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
}

@ApiTags('Organization calendar')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(OrgCalendarExceptionFilter)
@Controller('organization-calendar')
export class OrganizationCalendarController {
  constructor(
    private readonly listEvents: ListOrgCalendarEventsHandler,
    private readonly getMonth: GetOrgCalendarMonthHandler,
    private readonly getEmployeeMonth: GetEmployeeOrgCalendarMonthHandler,
    private readonly getEvent: GetOrgCalendarEventHandler,
    private readonly createEvent: CreateOrgCalendarEventHandler,
    private readonly updateEvent: UpdateOrgCalendarEventHandler,
    private readonly deleteEvent: DeleteOrgCalendarEventHandler,
    private readonly listHolidays: ListOrgCalendarHolidaysHandler,
    private readonly duplicateHolidays: DuplicateOrgCalendarHolidaysHandler,
    private readonly exportCalendar: ExportOrgCalendarHandler,
    private readonly classifyDate: ClassifyOrgCalendarDateHandler,
  ) {}

  @Get('events')
  @ApiOperation({ summary: 'List calendar events in a date range' })
  list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<OrgCalendarEventListResponse> {
    return this.listEvents.execute(actorFrom(ctx, request), parseOrgCalendarListQuery(query));
  }

  @Get('month')
  @ApiOperation({ summary: 'Calendar month view with day classification' })
  month(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<OrgCalendarMonthResponse> {
    return this.getMonth.execute(actorFrom(ctx, request), parseOrgCalendarMonthQuery(query));
  }

  @Get('employee/month')
  @ApiOperation({ summary: 'Employee read-only calendar month' })
  employeeMonth(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<OrgCalendarMonthResponse> {
    return this.getEmployeeMonth.execute(actorFrom(ctx, request), parseOrgCalendarMonthQuery(query));
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get calendar event' })
  one(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<OrgCalendarEventItem> {
    return this.getEvent.execute(actorFrom(ctx, request), id);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create calendar event' })
  create(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<OrgCalendarEventItem> {
    const input = createOrgCalendarEventRequestSchema.parse(body);
    return this.createEvent.execute(actorFrom(ctx, request), toEventWriteInput(input));
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update calendar event' })
  update(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<OrgCalendarEventItem> {
    const input = updateOrgCalendarEventRequestSchema.parse(body);
    return this.updateEvent.execute(actorFrom(ctx, request), id, toEventWriteInput(input));
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar event' })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteEvent.execute(actorFrom(ctx, request), id);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'List holidays' })
  holidays(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<OrgCalendarEventListResponse> {
    return this.listHolidays.execute(actorFrom(ctx, request), parseOrgCalendarHolidaysQuery(query));
  }

  @Post('holidays/duplicate')
  @ApiOperation({ summary: 'Duplicate holidays to another year' })
  duplicate(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<{ created: number }> {
    const input = duplicateOrgCalendarHolidaysRequestSchema.parse(body);
    return this.duplicateHolidays.execute(
      actorFrom(ctx, request),
      input.sourceYear,
      input.targetYear,
      input.eventTypes,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export calendar events as JSON' })
  export(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<readonly OrgCalendarEventItem[]> {
    return this.exportCalendar.execute(actorFrom(ctx, request), from, to);
  }

  @Get('classify')
  @ApiOperation({ summary: 'Classify a date for tasks and attendance helpers' })
  classify(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query('date') date: string,
  ): Promise<{ date: string; dayKind: 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY' }> {
    return this.classifyDate.execute(actorFrom(ctx, request), date);
  }
}
