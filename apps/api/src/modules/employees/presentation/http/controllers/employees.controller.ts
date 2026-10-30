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
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  EmployeeCodePreviewResponse,
  EmployeeDetail,
  EmployeeListResponse,
  EmployeeProfileImageUploadResponse,
} from '@techwin/contracts';
import {
  changeEmployeeStatusRequestSchema,
  createEmployeeRequestSchema,
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
} from '../../../../crm/index.js';
import { ChangeEmployeeStatusHandler } from '../../../application/change-employee-status/change-employee-status.handler.js';
import { CreateEmployeeHandler } from '../../../application/create-employee/create-employee.handler.js';
import { DeleteEmployeeHandler } from '../../../application/delete-employee/delete-employee.handler.js';
import { GetEmployeeHandler } from '../../../application/get-employee/get-employee.handler.js';
import { ListEmployeesHandler } from '../../../application/list-employees/list-employees.handler.js';
import { PreviewEmployeeCodeHandler } from '../../../application/preview-employee-code/preview-employee-code.handler.js';
import { UpdateEmployeeHandler } from '../../../application/update-employee/update-employee.handler.js';
import { UploadEmployeeProfileImageHandler } from '../../../application/upload-employee-profile-image/upload-employee-profile-image.handler.js';
import { StoredFileService } from '../../../../media/application/stored-file.service.js';
import { MediaExceptionFilter } from '../../../../media/presentation/http/filters/media-exception.filter.js';
import { canReadEmployeeCompensation } from '../../../application/compensation/employee-compensation-access.js';
import { PermissionCheckerService } from '../../../../org-access/application/services/permission-checker.service.js';
import { toOrgAccessActor } from '../../../../org-access/presentation/http/mappers/org-access-actor.mapper.js';
import {
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
import { toEmployeeDetail, toEmployeeListItem } from '../mappers/employee-response.mapper.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(EmployeeExceptionFilter, MediaExceptionFilter)
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
    @Inject(UploadEmployeeProfileImageHandler)
    private readonly uploadProfileImage: UploadEmployeeProfileImageHandler,
    @Inject(StoredFileService) private readonly storedFiles: StoredFileService,
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
    const opened = await this.storedFiles.openInlineEmployeeProfile(
      ctx.organizationId,
      storedObjectId,
    );
    response.setHeader('Content-Type', opened.contentType);
    response.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
    response.send(opened.body);
  }

  @Get('profile-images/:organizationId/:fileName')
  @RequirePermissions('employees.read')
  @ApiOperation({ summary: 'Stream employee profile image' })
  async streamProfileImage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('organizationId') organizationId: string,
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): Promise<void> {
    if (organizationId !== ctx.organizationId) {
      response.status(HttpStatus.NOT_FOUND).end();
      return;
    }
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
      response.status(HttpStatus.NOT_FOUND).end();
      return;
    }
    const path = join(process.cwd(), 'data', 'uploads', 'employees', organizationId, fileName);
    if (!existsSync(path)) {
      response.status(HttpStatus.NOT_FOUND).end();
      return;
    }
    const stream = createReadStream(path);
    stream.pipe(response);
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
