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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LeaveTypeItem, LeaveTypeListResponse } from '@techwin/contracts';
import {
  changeLeaveTypeStatusRequestSchema,
  createLeaveTypeRequestSchema,
  parseLeaveTypeListQuery,
  updateLeaveTypeRequestSchema,
} from '@techwin/validation';
import { PlatformAdminGuard, type PlatformAuthenticatedRequest } from '../../../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../../../platform/tenant-context/index.js';
import { RequirePermissionsGuard, toOrgAccessActor } from '../../../../../../org-access/index.js';
import { LeaveExceptionFilter } from '../../../../../presentation/http/filters/leave-exception.filter.js';
import { ChangeLeaveTypeStatusHandler } from '../../../application/change-leave-type-status/change-leave-type-status.handler.js';
import { CreateLeaveTypeHandler } from '../../../application/create-leave-type/create-leave-type.handler.js';
import { DeleteLeaveTypeHandler } from '../../../application/delete-leave-type/delete-leave-type.handler.js';
import { GetLeaveTypeHandler } from '../../../application/get-leave-type/get-leave-type.handler.js';
import { ListLeaveTypesHandler } from '../../../application/list-leave-types/list-leave-types.handler.js';
import { UpdateLeaveTypeHandler } from '../../../application/update-leave-type/update-leave-type.handler.js';

function actorFrom(ctx: CrmRequestContext, request: PlatformAuthenticatedRequest) {
  return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
}

@ApiTags('Leave types')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(LeaveExceptionFilter)
@Controller('leave/types')
export class LeaveTypesController {
  constructor(
    private readonly listLeaveTypes: ListLeaveTypesHandler,
    private readonly getLeaveType: GetLeaveTypeHandler,
    private readonly createLeaveType: CreateLeaveTypeHandler,
    private readonly updateLeaveType: UpdateLeaveTypeHandler,
    private readonly changeLeaveTypeStatus: ChangeLeaveTypeStatusHandler,
    private readonly deleteLeaveType: DeleteLeaveTypeHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List leave types' })
  list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Query() query: Record<string, unknown>,
  ): Promise<LeaveTypeListResponse> {
    return this.listLeaveTypes.execute(actorFrom(ctx, request), parseLeaveTypeListQuery(query));
  }

  @Post()
  @ApiOperation({ summary: 'Create leave type' })
  create(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<LeaveTypeItem> {
    return this.createLeaveType.execute(
      actorFrom(ctx, request),
      createLeaveTypeRequestSchema.parse(body),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave type' })
  one(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LeaveTypeItem> {
    return this.getLeaveType.execute(actorFrom(ctx, request), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update leave type' })
  patch(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveTypeItem> {
    return this.updateLeaveType.execute(
      actorFrom(ctx, request),
      id,
      updateLeaveTypeRequestSchema.parse(body),
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate leave type' })
  patchStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeaveTypeItem> {
    const parsed = changeLeaveTypeStatusRequestSchema.parse(body);
    return this.changeLeaveTypeStatus.execute(actorFrom(ctx, request), id, parsed.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete leave type' })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteLeaveType.execute(actorFrom(ctx, request), id);
  }
}
