import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AttendanceDeviceItem,
  AttendanceCalendarResponse,
  AttendanceListResponse,
  AttendanceMyTodayResponse,
  AttendanceRecordDetail,
  AttendanceRecordItem,
  AttendanceSettingsResponse,
  AttendanceSummaryResponse,
} from '@techwin/contracts';
import {
  correctAttendanceRecordRequestSchema,
  createAttendanceRecordRequestSchema,
  parseAttendanceCalendarQuery,
  parseAttendanceHistoryQuery,
  parseAttendanceListQuery,
  parseAttendanceSummaryQuery,
  punchAttendanceRequestSchema,
  registerAttendanceDeviceRequestSchema,
  upsertAttendanceSettingsRequestSchema,
} from '@techwin/validation';
import { PlatformAdminGuard, type PlatformAuthenticatedRequest } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions, toOrgAccessActor } from '../../../../org-access/index.js';
import { AttendanceSelfServiceGuard } from '../guards/attendance-self-service.guard.js';
import { CreateAttendanceRecordHandler } from '../../../application/create-record/create-record.handler.js';
import { CorrectAttendanceRecordHandler } from '../../../application/correct-record/correct-record.handler.js';
import { GetAttendanceCalendarHandler } from '../../../application/get-calendar/get-calendar.handler.js';
import {
  ListAttendanceDevicesHandler,
  RegisterAttendanceDeviceHandler,
  RevokeAttendanceDeviceHandler,
} from '../../../application/devices/attendance-devices.handlers.js';
import { GetAttendanceRecordDetailHandler } from '../../../application/get-record-detail/get-record-detail.handler.js';
import { GetMyAttendanceHistoryHandler } from '../../../application/get-my-history/get-my-history.handler.js';
import { GetMyAttendanceSummaryHandler } from '../../../application/get-my-summary/get-my-summary.handler.js';
import { GetMyTodayAttendanceHandler } from '../../../application/get-my-today/get-my-today.handler.js';
import { GetAttendanceSettingsHandler } from '../../../application/get-settings/get-settings.handler.js';
import { ListAttendanceRecordsHandler } from '../../../application/list-records/list-records.handler.js';
import { PunchInHandler } from '../../../application/punch-in/punch-in.handler.js';
import { PunchOutHandler } from '../../../application/punch-out/punch-out.handler.js';
import { UpsertAttendanceSettingsHandler } from '../../../application/upsert-settings/upsert-settings.handler.js';
import { AttendanceExceptionFilter } from '../filters/attendance-exception.filter.js';
import { isDesktopSession, resolveClientIp } from '../attendance-request.util.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseFilters(AttendanceExceptionFilter)
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, AttendanceSelfServiceGuard)
@Controller('attendance')
export class AttendanceController {
  private accessActor(ctx: CrmRequestContext, request: PlatformAuthenticatedRequest) {
    return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
  }

  constructor(
    private readonly punchIn: PunchInHandler,
    private readonly punchOut: PunchOutHandler,
    private readonly getMyToday: GetMyTodayAttendanceHandler,
    private readonly getMyHistory: GetMyAttendanceHistoryHandler,
    private readonly getMySummary: GetMyAttendanceSummaryHandler,
    private readonly getSettings: GetAttendanceSettingsHandler,
    private readonly upsertSettings: UpsertAttendanceSettingsHandler,
    private readonly listRecords: ListAttendanceRecordsHandler,
    private readonly getCalendar: GetAttendanceCalendarHandler,
    private readonly getRecordDetail: GetAttendanceRecordDetailHandler,
    private readonly createRecord: CreateAttendanceRecordHandler,
    private readonly correctRecord: CorrectAttendanceRecordHandler,
    private readonly listDevices: ListAttendanceDevicesHandler,
    private readonly registerDevice: RegisterAttendanceDeviceHandler,
    private readonly revokeDevice: RevokeAttendanceDeviceHandler,
  ) {}

  @Get('settings')
  @RequirePermissions('attendance.manage_settings', 'calendar.view', 'attendance.view_own')
  @ApiOperation({ summary: 'Get attendance settings' })
  getAttendanceSettings(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
  ): Promise<AttendanceSettingsResponse> {
    return this.getSettings.execute(this.accessActor(ctx, request));
  }

  @Patch('settings')
  @RequirePermissions('attendance.manage_settings')
  @ApiOperation({ summary: 'Create or update attendance schedule' })
  patchAttendanceSettings(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AttendanceSettingsResponse> {
    return this.upsertSettings.execute(
      this.accessActor(ctx, request),
      upsertAttendanceSettingsRequestSchema.parse(body),
    );
  }

  @Post('punch-in')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('attendance.punch_in')
  @ApiOperation({ summary: 'Punch in' })
  postPunchIn(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
    @Body() body: unknown,
  ): Promise<AttendanceRecordItem> {
    const ua = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
    return this.punchIn.execute({
      actor: this.accessActor(ctx, request),
      input: punchAttendanceRequestSchema.parse(body),
      userAgent: ua,
      ipAddress: resolveClientIp(request),
      now: new Date(),
    });
  }

  @Post('punch-out')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('attendance.punch_out')
  @ApiOperation({ summary: 'Punch out' })
  postPunchOut(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
    @Body() body: unknown,
  ): Promise<AttendanceRecordItem> {
    const ua = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
    return this.punchOut.execute({
      actor: this.accessActor(ctx, request),
      input: punchAttendanceRequestSchema.parse(body),
      userAgent: ua,
      ipAddress: resolveClientIp(request),
      now: new Date(),
    });
  }

  @Get('my/today')
  @RequirePermissions('attendance.view_own')
  @ApiOperation({ summary: 'Today attendance for signed-in employee' })
  getToday(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
  ): Promise<AttendanceMyTodayResponse> {
    return this.getMyToday.execute(
      this.accessActor(ctx, request),
      new Date(),
      isDesktopSession(request),
    );
  }

  @Get('my/history')
  @RequirePermissions('attendance.view_own')
  @ApiOperation({ summary: 'Attendance history for signed-in employee' })
  getHistory(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<AttendanceListResponse> {
    return this.getMyHistory.execute(
      this.accessActor(ctx, request),
      parseAttendanceHistoryQuery(query),
    );
  }

  @Get('my/summary')
  @RequirePermissions('attendance.view_summary')
  @ApiOperation({ summary: 'Attendance summary for signed-in employee' })
  getSummary(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<AttendanceSummaryResponse> {
    return this.getMySummary.execute(
      this.accessActor(ctx, request),
      parseAttendanceSummaryQuery(query),
    );
  }

  @Get('calendar')
  @RequirePermissions('attendance.view_all')
  @ApiOperation({ summary: 'Monthly attendance calendar summaries' })
  getAttendanceCalendar(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<AttendanceCalendarResponse> {
    return this.getCalendar.execute(
      this.accessActor(ctx, request),
      parseAttendanceCalendarQuery(query),
    );
  }

  @Post('records')
  @RequirePermissions('attendance.correct_records')
  @ApiOperation({ summary: 'Manually create an attendance record' })
  postAttendanceRecord(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AttendanceRecordDetail> {
    return this.createRecord.execute(
      this.accessActor(ctx, request),
      createAttendanceRecordRequestSchema.parse(body),
    );
  }

  @Get('records')
  @RequirePermissions('attendance.view_all')
  @ApiOperation({ summary: 'List organization attendance records' })
  listAttendanceRecords(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<AttendanceListResponse> {
    return this.listRecords.execute(
      this.accessActor(ctx, request),
      parseAttendanceListQuery(query),
    );
  }

  @Get('records/:id')
  @RequirePermissions('attendance.view_all')
  @ApiOperation({ summary: 'Attendance record detail' })
  getAttendanceRecord(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<AttendanceRecordDetail> {
    return this.getRecordDetail.execute(this.accessActor(ctx, request), id);
  }

  @Post('records/:id/corrections')
  @RequirePermissions('attendance.correct_records')
  @ApiOperation({ summary: 'Apply audited attendance correction' })
  postCorrection(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AttendanceRecordDetail> {
    return this.correctRecord.execute(
      this.accessActor(ctx, request),
      id,
      correctAttendanceRecordRequestSchema.parse(body),
    );
  }

  @Get('devices')
  @RequirePermissions('attendance.manage_devices')
  @ApiOperation({ summary: 'List trusted attendance devices' })
  getDevices(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
  ): Promise<readonly AttendanceDeviceItem[]> {
    return this.listDevices.execute(this.accessActor(ctx, request));
  }

  @Post('devices')
  @RequirePermissions('attendance.manage_devices')
  @ApiOperation({ summary: 'Register trusted attendance device' })
  postDevice(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest & Request,
    @Body() body: unknown,
  ): Promise<AttendanceDeviceItem> {
    const ua = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
    return this.registerDevice.execute(
      this.accessActor(ctx, request),
      registerAttendanceDeviceRequestSchema.parse(body),
      ua,
    );
  }

  @Delete('devices/:id')
  @RequirePermissions('attendance.manage_devices')
  @ApiOperation({ summary: 'Revoke trusted attendance device' })
  deleteDevice(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.revokeDevice.execute(this.accessActor(ctx, request), id);
  }
}
