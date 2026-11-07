import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  EmployeeLeaveBalanceItem,
  EmployeeLeaveBalanceListResponse,
  GenerateEmployeeBalancesResponse,
  LeavePreviewDaysResponse,
  LeaveRequestItem,
  LeaveRequestListResponse,
  LeaveYearAllocationItem,
  LeaveYearAllocationListResponse,
  LeaveYearConfigurationItem,
} from '@techwin/contracts';
import {
  adjustEmployeeLeaveBalanceRequestSchema,
  parseApplyLeaveRequest,
  cancelLeaveRequestSchema,
  createLeaveYearAllocationRequestSchema,
  createLeaveBalanceConfigurationRequestSchema,
  createLeaveYearConfigurationRequestSchema,
  updateLeaveBalanceConfigurationRequestSchema,
  parseEmployeeLeaveBalanceListQuery,
  parseLeaveAllocationListQuery,
  parseLeaveBalanceTransactionListQuery,
  parseLeaveRequestListQuery,
  parseLeaveYearConfigurationQuery,
  parsePreviewLeaveDaysQuery,
  rejectLeaveRequestSchema,
  updateLeaveYearAllocationRequestSchema,
  updateLeaveYearConfigurationRequestSchema,
  updateLeaveYearConfigurationStatusRequestSchema,
} from '@techwin/validation';
import { PlatformAdminGuard, type PlatformAuthenticatedRequest } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { RequirePermissionsGuard, toOrgAccessActor } from '../../../../org-access/index.js';
import {
  ActivateLeaveYearConfigurationHandler,
  CloseLeaveYearConfigurationHandler,
  SetLeaveYearConfigurationStatusHandler,
  AdjustEmployeeLeaveBalanceHandler,
  ApplyForLeaveHandler,
  ApproveLeaveRequestHandler,
  CancelLeaveRequestHandler,
  CreateLeaveAllocationHandler,
  CreateLeaveBalanceConfigurationHandler,
  CreateLeaveYearConfigurationHandler,
  DeleteLeaveYearConfigurationHandler,
  GenerateEmployeeLeaveBalancesHandler,
  GetEmployeeLeaveBalanceHandler,
  GetLeaveRequestHandler,
  GetLeaveYearConfigurationHandler,
  GetMyLeaveRequestHandler,
  ListEmployeeLeaveBalancesHandler,
  ListLeaveAllocationsHandler,
  ListLeaveBalanceTransactionsHandler,
  ListLeaveRequestsHandler,
  ListLeaveYearConfigurationsHandler,
  ListMyLeaveRequestsHandler,
  GetMyLeaveBalancesHandler,
  PreviewLeaveDaysHandler,
  RejectLeaveRequestHandler,
  UpdateLeaveAllocationHandler,
  UpdateLeaveBalanceConfigurationHandler,
  UpdateLeaveYearConfigurationHandler,
} from '../../../application/leave.handlers.js';
import { LeaveExceptionFilter } from '../filters/leave-exception.filter.js';
import type { LeaveBalanceTransactionListResponse } from '../../../domain/repositories/leave.repository.js';

function actorFrom(ctx: CrmRequestContext, request: PlatformAuthenticatedRequest) {
  return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
}

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(LeaveExceptionFilter)
@Controller('leave')
export class LeaveController {
  constructor(
    private readonly listYearConfigurations: ListLeaveYearConfigurationsHandler,
    private readonly getYearConfiguration: GetLeaveYearConfigurationHandler,
    private readonly createYearConfiguration: CreateLeaveYearConfigurationHandler,
    private readonly createBalanceConfiguration: CreateLeaveBalanceConfigurationHandler,
    private readonly updateBalanceConfiguration: UpdateLeaveBalanceConfigurationHandler,
    private readonly deleteYearConfiguration: DeleteLeaveYearConfigurationHandler,
    private readonly updateYearConfiguration: UpdateLeaveYearConfigurationHandler,
    private readonly activateYearConfiguration: ActivateLeaveYearConfigurationHandler,
    private readonly closeYearConfiguration: CloseLeaveYearConfigurationHandler,
    private readonly setYearConfigurationStatus: SetLeaveYearConfigurationStatusHandler,
    private readonly generateBalances: GenerateEmployeeLeaveBalancesHandler,
    private readonly listAllocations: ListLeaveAllocationsHandler,
    private readonly createAllocation: CreateLeaveAllocationHandler,
    private readonly updateAllocation: UpdateLeaveAllocationHandler,
    private readonly listEmployeeBalances: ListEmployeeLeaveBalancesHandler,
    private readonly getEmployeeBalance: GetEmployeeLeaveBalanceHandler,
    private readonly adjustEmployeeBalance: AdjustEmployeeLeaveBalanceHandler,
    private readonly listBalanceTransactions: ListLeaveBalanceTransactionsHandler,
    private readonly listLeaveRequests: ListLeaveRequestsHandler,
    private readonly getLeaveRequest: GetLeaveRequestHandler,
    private readonly getMyBalances: GetMyLeaveBalancesHandler,
    private readonly listMyRequests: ListMyLeaveRequestsHandler,
    private readonly getMyRequest: GetMyLeaveRequestHandler,
    private readonly previewLeaveDays: PreviewLeaveDaysHandler,
    private readonly applyForLeave: ApplyForLeaveHandler,
    private readonly cancelLeaveRequest: CancelLeaveRequestHandler,
    private readonly approveLeaveRequest: ApproveLeaveRequestHandler,
    private readonly rejectLeaveRequest: RejectLeaveRequestHandler,
  ) {}

  @Get('year-configurations')
  @ApiOperation({ summary: 'List leave year configurations' })
  async listYearConfigs(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<readonly LeaveYearConfigurationItem[] | LeaveYearConfigurationItem> {
    const actor = actorFrom(ctx, request);
    const parsed = parseLeaveYearConfigurationQuery(query);
    if (parsed.calendarYear) {
      const item = await this.getYearConfiguration.executeByYear(actor, parsed.calendarYear);
      if (!item) throw new NotFoundException('Leave year configuration was not found.');
      return item;
    }
    return this.listYearConfigurations.execute(actor);
  }

  @Post('year-configurations/with-allocations')
  @ApiOperation({ summary: 'Create leave balance configuration with allocations' })
  createBalanceConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<LeaveYearConfigurationItem> {
    return this.createBalanceConfiguration.execute(
      actorFrom(ctx, request),
      createLeaveBalanceConfigurationRequestSchema.parse(body),
    );
  }

  @Patch('year-configurations/:id/with-allocations')
  @ApiOperation({ summary: 'Update leave balance configuration with allocations' })
  patchBalanceConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveYearConfigurationItem> {
    return this.updateBalanceConfiguration.execute(
      actorFrom(ctx, request),
      id,
      updateLeaveBalanceConfigurationRequestSchema.parse(body),
    );
  }

  @Delete('year-configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete leave year configuration' })
  deleteYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.deleteYearConfiguration.execute(actorFrom(ctx, request), id);
  }

  @Post('year-configurations')
  @ApiOperation({ summary: 'Create leave year configuration' })
  createYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<LeaveYearConfigurationItem> {
    return this.createYearConfiguration.execute(
      actorFrom(ctx, request),
      createLeaveYearConfigurationRequestSchema.parse(body),
    );
  }

  @Get('year-configurations/:id')
  @ApiOperation({ summary: 'Get leave year configuration' })
  getYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveYearConfigurationItem> {
    return this.getYearConfiguration.execute(actorFrom(ctx, request), id);
  }

  @Patch('year-configurations/:id')
  @ApiOperation({ summary: 'Update leave year configuration' })
  patchYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveYearConfigurationItem> {
    return this.updateYearConfiguration.execute(
      actorFrom(ctx, request),
      id,
      updateLeaveYearConfigurationRequestSchema.parse(body),
    );
  }

  @Post('year-configurations/:id/activate')
  @ApiOperation({ summary: 'Activate leave year configuration' })
  activateYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveYearConfigurationItem> {
    return this.activateYearConfiguration.execute(actorFrom(ctx, request), id);
  }

  @Patch('year-configurations/:id/status')
  @ApiOperation({ summary: 'Set leave balance policy active or inactive' })
  patchYearConfigStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveYearConfigurationItem> {
    return this.setYearConfigurationStatus.execute(
      actorFrom(ctx, request),
      id,
      updateLeaveYearConfigurationStatusRequestSchema.parse(body),
    );
  }

  @Post('year-configurations/:id/close')
  @ApiOperation({ summary: 'Close leave year configuration' })
  closeYearConfig(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveYearConfigurationItem> {
    return this.closeYearConfiguration.execute(actorFrom(ctx, request), id);
  }

  @Post('year-configurations/:id/generate-balances')
  @ApiOperation({ summary: 'Generate employee leave balances for a year' })
  generateEmployeeBalances(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<GenerateEmployeeBalancesResponse> {
    return this.generateBalances.execute(actorFrom(ctx, request), id);
  }

  @Get('allocations')
  @ApiOperation({ summary: 'List leave allocations for a year configuration' })
  listAllocs(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeaveYearAllocationListResponse> {
    return this.listAllocations.execute(actorFrom(ctx, request), parseLeaveAllocationListQuery(query));
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Create leave allocation' })
  createAlloc(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<LeaveYearAllocationItem> {
    return this.createAllocation.execute(
      actorFrom(ctx, request),
      createLeaveYearAllocationRequestSchema.parse(body),
    );
  }

  @Patch('allocations/:id')
  @ApiOperation({ summary: 'Update leave allocation' })
  patchAlloc(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveYearAllocationItem> {
    return this.updateAllocation.execute(
      actorFrom(ctx, request),
      id,
      updateLeaveYearAllocationRequestSchema.parse(body),
    );
  }

  @Get('employee-balances')
  @ApiOperation({ summary: 'List employee leave balances' })
  listBalances(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<EmployeeLeaveBalanceListResponse> {
    return this.listEmployeeBalances.execute(
      actorFrom(ctx, request),
      parseEmployeeLeaveBalanceListQuery(query),
    );
  }

  @Get('employee-balances/:id')
  @ApiOperation({ summary: 'Get employee leave balance' })
  oneBalance(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<EmployeeLeaveBalanceItem> {
    return this.getEmployeeBalance.execute(actorFrom(ctx, request), id);
  }

  @Post('employee-balances/:id/adjust')
  @ApiOperation({ summary: 'Adjust employee leave balance' })
  adjustBalance(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EmployeeLeaveBalanceItem> {
    return this.adjustEmployeeBalance.execute(
      actorFrom(ctx, request),
      id,
      adjustEmployeeLeaveBalanceRequestSchema.parse(body),
    );
  }

  @Get('balance-transactions')
  @ApiOperation({ summary: 'List leave balance transactions' })
  balanceTransactions(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeaveBalanceTransactionListResponse> {
    return this.listBalanceTransactions.execute(
      actorFrom(ctx, request),
      parseLeaveBalanceTransactionListQuery(query),
    );
  }

  @Get('requests')
  @ApiOperation({ summary: 'List leave requests (admin)' })
  requests(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeaveRequestListResponse> {
    return this.listLeaveRequests.execute(actorFrom(ctx, request), parseLeaveRequestListQuery(query));
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get leave request (admin)' })
  oneRequest(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveRequestItem> {
    return this.getLeaveRequest.execute(actorFrom(ctx, request), id);
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve leave request' })
  approve(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveRequestItem> {
    return this.approveLeaveRequest.execute(actorFrom(ctx, request), id);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject leave request' })
  reject(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveRequestItem> {
    const input = rejectLeaveRequestSchema.parse(body);
    return this.rejectLeaveRequest.execute(actorFrom(ctx, request), id, input.rejectionReason);
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel leave request (admin)' })
  cancelAdmin(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveRequestItem> {
    const input = cancelLeaveRequestSchema.parse(body);
    return this.cancelLeaveRequest.execute(actorFrom(ctx, request), id, input.reason);
  }

  @Get('my/balances')
  @ApiOperation({ summary: 'List my leave balances' })
  myBalances(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<EmployeeLeaveBalanceListResponse> {
    return this.getMyBalances.execute(
      actorFrom(ctx, request),
      parseEmployeeLeaveBalanceListQuery(query),
    );
  }

  @Get('my/requests')
  @ApiOperation({ summary: 'List my leave requests' })
  myRequests(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeaveRequestListResponse> {
    return this.listMyRequests.execute(actorFrom(ctx, request), parseLeaveRequestListQuery(query));
  }

  @Get('my/requests/:id')
  @ApiOperation({ summary: 'Get my leave request' })
  myRequest(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveRequestItem> {
    return this.getMyRequest.execute(actorFrom(ctx, request), id);
  }

  @Post('my/apply')
  @ApiOperation({ summary: 'Apply for leave' })
  apply(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<LeaveRequestItem> {
    return this.applyForLeave.execute(actorFrom(ctx, request), parseApplyLeaveRequest(body));
  }

  @Get('my/preview-days')
  @ApiOperation({ summary: 'Preview leave day count' })
  previewDays(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeavePreviewDaysResponse> {
    return this.previewLeaveDays.execute(actorFrom(ctx, request), parsePreviewLeaveDaysQuery(query));
  }
}
