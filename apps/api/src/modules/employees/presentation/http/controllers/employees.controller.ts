import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AssignableEmployeeListResponse,
  DeleteEmployeeResponse,
  EmployeeDeletionImpact,
  EmployeeCodePreviewResponse,
  EmployeeDetail,
  EmployeeListResponse,
  EmployeeProfileImageUploadResponse,
} from '@techwin/contracts';
import {
  changeEmployeeStatusRequestSchema,
  createEmployeeRequestSchema,
  parseAssignableEmployeeQuery,
  parseEmployeeListQuery,
  updateEmployeeRequestSchema,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from '@techwin/validation';
import {
  PlatformAdminGuard,
  type PlatformAuthenticatedRequest,
} from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { ChangeEmployeeStatusHandler } from '../../../application/change-employee-status/change-employee-status.handler.js';
import { CreateEmployeeHandler } from '../../../application/create-employee/create-employee.handler.js';
import { DeleteEmployeeHandler } from '../../../application/delete-employee/delete-employee.handler.js';
import { GetEmployeeDeletionImpactHandler } from '../../../application/get-employee-deletion-impact/get-employee-deletion-impact.handler.js';
import { GetEmployeeHandler } from '../../../application/get-employee/get-employee.handler.js';
import { ListAssignableEmployeesHandler } from '../../../application/list-assignable-employees/list-assignable-employees.handler.js';
import { ListEmployeesHandler } from '../../../application/list-employees/list-employees.handler.js';
import { OpenStoredProfileImageHandler } from '../../../application/open-stored-profile-image/open-stored-profile-image.handler.js';
import { PreviewEmployeeCodeHandler } from '../../../application/preview-employee-code/preview-employee-code.handler.js';
import { StreamLegacyProfileImageHandler } from '../../../application/stream-legacy-profile-image/stream-legacy-profile-image.handler.js';
import { UpdateEmployeeHandler } from '../../../application/update-employee/update-employee.handler.js';
import { UploadEmployeeProfileImageHandler } from '../../../application/upload-employee-profile-image/upload-employee-profile-image.handler.js';
import { canReadEmployeeCompensation } from '../../../application/access/employee-compensation-access.js';
import { MediaExceptionFilter } from '../../../../media/index.js';
import {
  assignableEmployeeListResponseSchema,
  employeeCodePreviewResponseSchema,
  employeeDetailResponseSchema,
  employeeListResponseSchema,
  toOpenApiSchema,
} from '../dto/employee.schemas.js';
import { EmployeeExceptionFilter } from '../filters/employee-exception.filter.js';
import { toEmployeeActor } from '../mappers/employee-actor.mapper.js';
import {
  toCreateEmployeeInput,
  toUpdateEmployeeInput,
} from '../mappers/employee-request.mapper.js';
import {
  toAssignableEmployee,
  toEmployeeDetail,
  toEmployeeListItem,
} from '../mappers/employee-response.mapper.js';
import {
  PermissionCheckerService,
  RequirePermissions,
  RequirePermissionsGuard,
  toOrgAccessActor,
} from '../../../../org-access/index.js';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(EmployeeExceptionFilter, MediaExceptionFilter)
export class EmployeesController {
  constructor(
    @Inject(ListEmployeesHandler) private readonly listEmployees: ListEmployeesHandler,
    @Inject(ListAssignableEmployeesHandler)
    private readonly listAssignableEmployees: ListAssignableEmployeesHandler,
    @Inject(GetEmployeeHandler) private readonly getEmployee: GetEmployeeHandler,
    @Inject(GetEmployeeDeletionImpactHandler)
    private readonly getEmployeeDeletionImpact: GetEmployeeDeletionImpactHandler,
    @Inject(CreateEmployeeHandler) private readonly createEmployee: CreateEmployeeHandler,
    @Inject(UpdateEmployeeHandler) private readonly updateEmployee: UpdateEmployeeHandler,
    @Inject(ChangeEmployeeStatusHandler)
    private readonly changeEmployeeStatus: ChangeEmployeeStatusHandler,
    @Inject(DeleteEmployeeHandler) private readonly deleteEmployee: DeleteEmployeeHandler,
    @Inject(PreviewEmployeeCodeHandler)
    private readonly previewEmployeeCode: PreviewEmployeeCodeHandler,
    @Inject(UploadEmployeeProfileImageHandler)
    private readonly uploadProfileImage: UploadEmployeeProfileImageHandler,
    @Inject(OpenStoredProfileImageHandler)
    private readonly openStoredProfileImage: OpenStoredProfileImageHandler,
    @Inject(StreamLegacyProfileImageHandler)
    private readonly streamLegacyProfileImage: StreamLegacyProfileImageHandler,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
  ) {}

  private accessActor(request: PlatformAuthenticatedRequest, ctx: CrmRequestContext) {
    return toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
  }

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

  @Get('assignable')
  @RequirePermissions('employees.read', 'tasks.read', 'tasks.assign', 'projects.read')
  @ApiOperation({ summary: 'List active employees for task assignment pickers' })
  @ApiOkResponse({ schema: toOpenApiSchema(assignableEmployeeListResponseSchema) })
  async assignable(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<AssignableEmployeeListResponse> {
    const query = parseAssignableEmployeeQuery(request.query);
    const items = await this.listAssignableEmployees.execute({
      actor: toEmployeeActor(ctx),
      search: query.search,
    });
    return { items: items.map(toAssignableEmployee) };
  }

  @Get('code-preview')
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Preview next employee code' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeCodePreviewResponseSchema) })
  async previewCode(@CrmContext() ctx: CrmRequestContext): Promise<EmployeeCodePreviewResponse> {
    const result = await this.previewEmployeeCode.execute({ actor: toEmployeeActor(ctx) });
    return { employeeCode: result.employeeCode, isPreview: true };
  }

  @Post('profile-image')
  @RequirePermissions('employees.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload employee profile image' })
  async uploadProfileImageFile(
    @CrmContext() ctx: CrmRequestContext,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<EmployeeProfileImageUploadResponse> {
    return this.uploadProfileImage.execute({
      actor: toEmployeeActor(ctx),
      file,
    });
  }

  @Get('profile-stored-objects/:storedObjectId/content')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Stream employee profile image (stored object)' })
  async streamStoredProfileImage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('storedObjectId') storedObjectId: string,
    @Res() response: Response,
  ): Promise<void> {
    const opened = await this.openStoredProfileImage.execute({
      organizationId: ctx.organizationId,
      storedObjectId,
    });
    response.setHeader('Content-Type', opened.contentType);
    response.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
    response.send(opened.body);
  }

  @Get('profile-images/:organizationId/:fileName')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Stream employee profile image' })
  streamProfileImage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('organizationId') organizationId: string,
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): void {
    const result = this.streamLegacyProfileImage.execute({
      trustedOrganizationId: ctx.organizationId,
      organizationId,
      fileName,
    });
    if (result.kind === 'not_found') {
      response.status(HttpStatus.NOT_FOUND).end();
      return;
    }
    const stream = createReadStream(result.absolutePath);
    stream.pipe(response);
  }

  @Get(':id/deletion-impact')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Daily task assignments that affect employee deletion' })
  async deletionImpact(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<EmployeeDeletionImpact> {
    return this.getEmployeeDeletionImpact.execute({
      organizationId: ctx.organizationId,
      employeeId: id,
    });
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Get employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<EmployeeDetail> {
    const employee = await this.getEmployee.execute({
      actor: toEmployeeActor(ctx),
      employeeId: id,
    });
    const includeCompensation = await canReadEmployeeCompensation(
      this.permissionChecker,
      this.accessActor(request, ctx),
    );
    return toEmployeeDetail(employee, { includeCompensation });
  }

  @Post()
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Create employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body: CreateEmployeeRequest = createEmployeeRequestSchema.parse(raw);
    const accessActor = this.accessActor(request, ctx);
    const employee = await this.createEmployee.execute({
      actor: toEmployeeActor(ctx),
      accessActor,
      input: toCreateEmployeeInput(body),
    });
    const includeCompensation = await canReadEmployeeCompensation(
      this.permissionChecker,
      accessActor,
    );
    return toEmployeeDetail(employee, { includeCompensation });
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Update employee' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body: UpdateEmployeeRequest = updateEmployeeRequestSchema.parse(raw);
    const accessActor = this.accessActor(request, ctx);
    const employee = await this.updateEmployee.execute({
      actor: toEmployeeActor(ctx),
      accessActor,
      employeeId: id,
      input: toUpdateEmployeeInput(body),
    });
    const includeCompensation = await canReadEmployeeCompensation(
      this.permissionChecker,
      accessActor,
    );
    return toEmployeeDetail(employee, { includeCompensation });
  }

  @Patch(':id/status')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Change employee employment status' })
  @ApiOkResponse({ schema: toOpenApiSchema(employeeDetailResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<EmployeeDetail> {
    const body = changeEmployeeStatusRequestSchema.parse(raw);
    const employee = await this.changeEmployeeStatus.execute({
      actor: toEmployeeActor(ctx),
      accessActor: this.accessActor(request, ctx),
      employeeId: id,
      status: body.status,
    });
    return toEmployeeDetail(employee);
  }

  @Delete(':id')
  @RequirePermissions('employees.update')
  @ApiOperation({
    summary: 'Permanently delete employee and the sign-in account created with it',
  })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: PlatformAuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DeleteEmployeeResponse> {
    const result = await this.deleteEmployee.execute({
      actor: toEmployeeActor(ctx),
      accessActor: this.accessActor(request, ctx),
      employeeId: id,
    });
    return { loginAccount: result.loginAccount };
  }
}
