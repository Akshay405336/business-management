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
import { CrmUseCases } from '../../../application/crm-use-cases.js';
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
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @RequirePermissions('settings.read')
  @Get()
  @ApiOperation({ summary: 'List service packages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmServicePackageListResponseSchema) })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmServicePackageListResponse> {
    const packages = await this.crm.listServicePackages(ctx);
    return { packages: packages.map(toCrmServicePackage) };
  }

  @RequirePermissions('settings.read')
  @Get('code-preview')
  @ApiOperation({ summary: 'Preview the next TECH-PKG package code (not reserved until create)' })
  @ApiOkResponse({ schema: toOpenApiSchema(servicePackageCodePreviewResponseSchema) })
  async previewCode(@CrmContext() ctx: CrmRequestContext): Promise<ServicePackageCodePreviewResponse> {
    const code = await this.crm.previewServicePackageCode(ctx);
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
    const pkg = await this.crm.getServicePackage(ctx, packageId);
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
    const pkg = await this.crm.createServicePackage(
      ctx,
      toCreateServicePackageInput(body, ctx.adminId),
    );
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
    const pkg = await this.crm.changeServicePackageStatus(ctx, packageId, body);
    return toCrmServicePackage(pkg);
  }

  @RequirePermissions('settings.manage')
  @Delete(':packageId')
  @ApiOperation({ summary: 'Permanently delete a service package' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('packageId') packageId: string,
  ): Promise<void> {
    await this.crm.deleteServicePackage(ctx, packageId);
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
    const pkg = await this.crm.updateServicePackage(
      ctx,
      packageId,
      toUpdateServicePackageInput(body),
    );
    return toCrmServicePackage(pkg);
  }
}
