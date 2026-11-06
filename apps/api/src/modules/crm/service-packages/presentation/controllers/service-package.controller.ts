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
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  CrmServicePackage,
  CrmServicePackageListResponse,
  ServicePackageCodePreviewResponse,
} from '@techwin/contracts';
import type {
  ChangeServicePackageStatusRequest,
  CreateServicePackageRequest,
  UpdateServicePackageRequest,
} from '@techwin/validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { ChangeServicePackageStatusHandler } from '../../application/change-status/change-service-package-status.handler.js';
import { CreateServicePackageHandler } from '../../application/create/create-service-package.handler.js';
import { DeleteServicePackageHandler } from '../../application/delete/delete-service-package.handler.js';
import { GetServicePackageHandler } from '../../application/get/get-service-package.handler.js';
import { ListServicePackagesHandler } from '../../application/list/list-service-packages.handler.js';
import { PreviewServicePackageCodeHandler } from '../../application/preview-code/preview-service-package-code.handler.js';
import { UpdateServicePackageHandler } from '../../application/update/update-service-package.handler.js';
import {
  crmServicePackageListResponseSchema,
  crmServicePackageResponseSchema,
  servicePackageCodePreviewResponseSchema,
  toOpenApiSchema,
} from '../../../presentation/http/dto/crm.schemas.js';
import {
  changeServicePackageStatusBodySchema,
  createServicePackageBodySchema,
  updateServicePackageBodySchema,
} from '../dto/service-package.dto.js';
import { CrmExceptionFilter } from '../../../presentation/http/filters/crm-exception.filter.js';
import { CrmContext } from '../../../presentation/http/guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../../../presentation/http/guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../../../presentation/http/guards/crm-organization.guard.js';
import { toCrmActor } from '../../../presentation/http/mappers/crm-actor.mapper.js';
import {
  toCreateServicePackageInput,
  toUpdateServicePackageInput,
} from '../../../presentation/http/mappers/service-package-request.mapper.js';
import { toCrmServicePackage } from '../mappers/service-package-response.mapper.js';

@ApiTags('CRM service packages')
@ApiBearerAuth()
@Controller('crm/service-packages')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class ServicePackageController {
  constructor(
    @Inject(ListServicePackagesHandler) private readonly listServicePackages: ListServicePackagesHandler,
    @Inject(PreviewServicePackageCodeHandler)
    private readonly previewServicePackageCode: PreviewServicePackageCodeHandler,
    @Inject(GetServicePackageHandler) private readonly getServicePackage: GetServicePackageHandler,
    @Inject(CreateServicePackageHandler) private readonly createServicePackage: CreateServicePackageHandler,
    @Inject(ChangeServicePackageStatusHandler)
    private readonly changeServicePackageStatus: ChangeServicePackageStatusHandler,
    @Inject(DeleteServicePackageHandler) private readonly deleteServicePackage: DeleteServicePackageHandler,
    @Inject(UpdateServicePackageHandler) private readonly updateServicePackage: UpdateServicePackageHandler,
  ) {}

  @RequirePermissions('settings.read')
  @Get()
  @ApiOperation({ summary: 'List service packages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageListResponseSchema) })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmServicePackageListResponse> {
    const result = await this.listServicePackages.execute({ actor: toCrmActor(ctx) });
    return { packages: result.packages.map(toCrmServicePackage) };
  }

  @RequirePermissions('settings.read')
  @Get('code-preview')
  @ApiOperation({ summary: 'Preview the next TECH-PKG package code (not reserved until create)' })
  @ApiOkResponse({ schema: toOpenApiSchema(servicePackageCodePreviewResponseSchema) })
  async previewCode(@CrmContext() ctx: CrmRequestContext): Promise<ServicePackageCodePreviewResponse> {
    const result = await this.previewServicePackageCode.execute({ actor: toCrmActor(ctx) });
    return { code: result.code, isPreview: true };
  }

  @RequirePermissions('settings.read')
  @Get(':packageId')
  @ApiOperation({ summary: 'Get a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
  ): Promise<CrmServicePackage> {
    const result = await this.getServicePackage.execute({
      actor: toCrmActor(ctx),
      packageId,
    });
    return toCrmServicePackage(result.package);
  }

  @RequirePermissions('settings.manage')
  @Post()
  @ApiOperation({ summary: 'Create a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createServicePackageBodySchema }) body: CreateServicePackageRequest,
  ): Promise<CrmServicePackage> {
    const result = await this.createServicePackage.execute({
      actor: toCrmActor(ctx),
      input: toCreateServicePackageInput(body, ctx.adminId),
    });
    return toCrmServicePackage(result.package);
  }

  @RequirePermissions('settings.manage')
  @Patch(':packageId/status')
  @ApiOperation({ summary: 'Activate or deactivate a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
    @Body({ schema: changeServicePackageStatusBodySchema })
    body: ChangeServicePackageStatusRequest,
  ): Promise<CrmServicePackage> {
    const result = await this.changeServicePackageStatus.execute({
      actor: toCrmActor(ctx),
      packageId,
      input: body,
    });
    return toCrmServicePackage(result.package);
  }

  @RequirePermissions('settings.manage')
  @Delete(':packageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a service package' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
  ): Promise<void> {
    await this.deleteServicePackage.execute({ actor: toCrmActor(ctx), packageId });
  }

  @RequirePermissions('settings.manage')
  @Patch(':packageId')
  @ApiOperation({ summary: 'Update a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
    @Body({ schema: updateServicePackageBodySchema }) body: UpdateServicePackageRequest,
  ): Promise<CrmServicePackage> {
    const result = await this.updateServicePackage.execute({
      actor: toCrmActor(ctx),
      packageId,
      input: toUpdateServicePackageInput(body),
    });
    return toCrmServicePackage(result.package);
  }
}
