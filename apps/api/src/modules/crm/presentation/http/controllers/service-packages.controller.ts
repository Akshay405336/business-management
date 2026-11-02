import {
  Body,
  Controller,
  Delete,
  Get,
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
import { ChangeServicePackageStatusHandler } from '../../../application/change-service-package-status/change-service-package-status.handler.js';
import { CreateServicePackageHandler } from '../../../application/create-service-package/create-service-package.handler.js';
import { DeleteServicePackageHandler } from '../../../application/delete-service-package/delete-service-package.handler.js';
import { GetServicePackageHandler } from '../../../application/get-service-package/get-service-package.handler.js';
import { ListServicePackagesHandler } from '../../../application/list-service-packages/list-service-packages.handler.js';
import { PreviewServicePackageCodeHandler } from '../../../application/preview-service-package-code/preview-service-package-code.handler.js';
import { UpdateServicePackageHandler } from '../../../application/update-service-package/update-service-package.handler.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  changeServicePackageStatusBodySchema,
  createServicePackageBodySchema,
  crmServicePackageListResponseSchema,
  crmServicePackageResponseSchema,
  servicePackageCodePreviewResponseSchema,
  toOpenApiSchema,
  updateServicePackageBodySchema,
} from '../dto/crm.schemas.js';
import { CrmExceptionFilter } from '../filters/crm-exception.filter.js';
import { CrmContext } from '../guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../guards/crm-organization.guard.js';
import { toCrmActor } from '../mappers/crm-actor.mapper.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { toCrmServicePackage } from '../mappers/crm-response.mapper.js';
import {
  toCreateServicePackageInput,
  toUpdateServicePackageInput,
} from '../mappers/service-package-request.mapper.js';

@ApiTags('CRM service packages')
@ApiBearerAuth()
@Controller('crm/service-packages')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class ServicePackagesController {
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
    const packages = await this.listServicePackages.execute({ actor: toCrmActor(ctx) });
    return { packages: packages.map(toCrmServicePackage) };
  }

  @RequirePermissions('settings.read')
  @Get('code-preview')
  @ApiOperation({ summary: 'Preview the next TECH-PKG package code (not reserved until create)' })
  @ApiOkResponse({ schema: toOpenApiSchema(servicePackageCodePreviewResponseSchema) })
  async previewCode(@CrmContext() ctx: CrmRequestContext): Promise<ServicePackageCodePreviewResponse> {
    const code = await this.previewServicePackageCode.execute({ actor: toCrmActor(ctx) });
    return { code, isPreview: true };
  }

  @RequirePermissions('settings.read')
  @Get(':packageId')
  @ApiOperation({ summary: 'Get a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
  ): Promise<CrmServicePackage> {
    const pkg = await this.getServicePackage.execute({
      actor: toCrmActor(ctx),
      packageId,
    });
    return toCrmServicePackage(pkg);
  }

  @RequirePermissions('settings.manage')
  @Post()
  @ApiOperation({ summary: 'Create a service package' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createServicePackageBodySchema }) body: CreateServicePackageRequest,
  ): Promise<CrmServicePackage> {
    const pkg = await this.createServicePackage.execute({
      actor: toCrmActor(ctx),
      input: toCreateServicePackageInput(body, ctx.adminId),
    });
    return toCrmServicePackage(pkg);
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
    const pkg = await this.changeServicePackageStatus.execute({
      actor: toCrmActor(ctx),
      packageId,
      input: body,
    });
    return toCrmServicePackage(pkg);
  }

  @RequirePermissions('settings.manage')
  @Delete(':packageId')
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
    const pkg = await this.updateServicePackage.execute({
      actor: toCrmActor(ctx),
      packageId,
      input: toUpdateServicePackageInput(body),
    });
    return toCrmServicePackage(pkg);
  }
}
