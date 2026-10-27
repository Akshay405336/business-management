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
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  EmployeeCodePreviewResponse,
  EmployeeDetail,
  EmployeeListResponse,
  EmployeeManagerOptionsResponse,
} from '@techwin/contracts';
import {
  changeEmployeeStatusRequestSchema,
  createEmployeeRequestSchema,
  parseEmployeeListQuery,
  updateEmployeeRequestSchema,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from '@techwin/validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../crm/index.js';
import { ChangeEmployeeStatusHandler } from '../../../application/change-employee-status/change-employee-status.handler.js';
import { CreateEmployeeHandler } from '../../../application/create-employee/create-employee.handler.js';
import { DeleteEmployeeHandler } from '../../../application/delete-employee/delete-employee.handler.js';
import { GetEmployeeHandler } from '../../../application/get-employee/get-employee.handler.js';
import { ListEmployeeManagersHandler } from '../../../application/list-employee-managers/list-employee-managers.handler.js';
import { ListEmployeesHandler } from '../../../application/list-employees/list-employees.handler.js';
import { PreviewEmployeeCodeHandler } from '../../../application/preview-employee-code/preview-employee-code.handler.js';
import { UpdateEmployeeHandler } from '../../../application/update-employee/update-employee.handler.js';
import {
  employeeCodePreviewResponseSchema,
  employeeDetailResponseSchema,
  employeeListResponseSchema,
  employeeManagerOptionsResponseSchema,
  toOpenApiSchema,
} from '../dto/employee.schemas.js';
import { EmployeeExceptionFilter } from '../filters/employee-exception.filter.js';
import { toEmployeeActor } from '../mappers/employee-actor.mapper.js';
import {
  toCreateEmployeeInput,
  toUpdateEmployeeInput,
} from '../mappers/employee-request.mapper.js';
import { toEmployeeDetail, toEmployeeListItem } from '../mappers/employee-response.mapper.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(EmployeeExceptionFilter)
export class EmployeesController {
  constructor(
    @Inject(ListEmployeesHandler) private readonly listEmployees: ListEmployeesHandler,
    @Inject(GetEmployeeHandler) private readonly getEmployee: GetEmployeeHandler,
    @Inject(CreateEmployeeHandler) private readonly createEmployee: CreateEmployeeHandler,
    @Inject(UpdateEmployeeHandler) private readonly updateEmployee: UpdateEmployeeHandler,
    @Inject(ChangeEmployeeStatusHandler)
    private readonly changeEmployeeStatus: ChangeEmployeeStatusHandler,
    @Inject(DeleteEmployeeHandler) private readonly deleteEmployee: DeleteEmployeeHandler,
    @Inject(PreviewEmployeeCodeHandler)
    private readonly previewEmployeeCode: PreviewEmployeeCodeHandler,
    @Inject(ListEmployeeManagersHandler)
    private readonly listEmployeeManagers: ListEmployeeManagersHandler,
  ) {}

  @Get()
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'List employees' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<EmployeeListResponse> {
    const listQuery = parseEmployeeListQuery(request.query);
    const result = await this.listEmployees.execute({
      actor: toEmployeeActor(ctx),
      listQuery,
    });
    return {
      items: result.items.map(toEmployeeListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get('code-preview')
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Preview next employee code' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeCodePreviewResponseSchema) })
  async previewCode(@CrmContext() ctx: CrmRequestContext): Promise<EmployeeCodePreviewResponse> {
    const result = await this.previewEmployeeCode.execute({ actor: toEmployeeActor(ctx) });
    return { employeeCode: result.employeeCode, isPreview: true };
  }

  @Get('manager-options')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'List reporting manager options' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeManagerOptionsResponseSchema) })
  async managerOptions(
    @CrmContext() ctx: CrmRequestContext,
    @Query('excludeEmployeeId') excludeEmployeeId?: string,
  ): Promise<EmployeeManagerOptionsResponse> {
    const result = await this.listEmployeeManagers.execute({
      actor: toEmployeeActor(ctx),
      excludeEmployeeId: excludeEmployeeId?.trim() || undefined,
    });
    return { managers: [...result.managers] };
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Get employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async get(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<EmployeeDetail> {
    const employee = await this.getEmployee.execute({
      actor: toEmployeeActor(ctx),
      employeeId: id,
    });
    return toEmployeeDetail(employee);
  }

  @Post()
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Create employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body: CreateEmployeeRequest = createEmployeeRequestSchema.parse(raw);
    const employee = await this.createEmployee.execute({
      actor: toEmployeeActor(ctx),
      input: toCreateEmployeeInput(body),
    });
    return toEmployeeDetail(employee);
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Update employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body: UpdateEmployeeRequest = updateEmployeeRequestSchema.parse(raw);
    const employee = await this.updateEmployee.execute({
      actor: toEmployeeActor(ctx),
      employeeId: id,
      input: toUpdateEmployeeInput(body),
    });
    return toEmployeeDetail(employee);
  }

  @Patch(':id/status')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Change employee employment status' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body = changeEmployeeStatusRequestSchema.parse(raw);
    const employee = await this.changeEmployeeStatus.execute({
      actor: toEmployeeActor(ctx),
      employeeId: id,
      status: body.status,
    });
    return toEmployeeDetail(employee);
  }

  @Delete(':id')
  @RequirePermissions('employees.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete employee' })
  async remove(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteEmployee.execute({
      actor: toEmployeeActor(ctx),
      employeeId: id,
    });
  }
}
