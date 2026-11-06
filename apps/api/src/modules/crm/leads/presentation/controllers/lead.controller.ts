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
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  CrmLead,
  CrmLeadActivity,
  CrmLeadActivityListResponse,
  CrmLeadConvertResponse,
  CrmLeadImportPreviewResponse,
  CrmLeadImportResponse,
  CrmLeadListResponse,
  CrmLeadTag,
  CrmLeadBulkActionResponse,
  CrmLeadTagListResponse,
} from '@techwin/contracts';
import {
  bulkLeadIdsRequestSchema,
  createLeadTagRequestSchema,
  executeLeadImportRequestSchema,
  parseLeadListQuery,
  type LinkLeadToClientRequest,
  validateLeadImportRequestSchema,
  type ChangeLeadStageRequest,
  type CreateLeadActivityRequest,
  type CreateLeadRequest,
  type CreateLeadTagRequest,
  type UpdateLeadRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { ChangeLeadStageHandler } from '../../application/change-stage/change-lead-stage.handler.js';
import { ConvertLeadHandler } from '../../application/convert/convert-lead.handler.js';
import { LinkLeadToClientHandler } from '../../application/link-client/link-lead-to-client.handler.js';
import { CreateLeadActivityHandler } from '../../application/create-activity/create-lead-activity.handler.js';
import { CreateLeadHandler } from '../../application/create/create-lead.handler.js';
import { BulkDeleteLeadsHandler } from '../../application/bulk-delete/bulk-delete-leads.handler.js';
import { DeleteLeadHandler } from '../../application/delete/delete-lead.handler.js';
import { GetLeadHandler } from '../../application/get/get-lead.handler.js';
import { ListLeadActivitiesHandler } from '../../application/list-activities/list-lead-activities.handler.js';
import { ListLeadsHandler } from '../../application/list/list-leads.handler.js';
import { UpdateLeadHandler } from '../../application/update/update-lead.handler.js';
import { ExecuteLeadImportHandler } from '../../application/import/execute-lead-import.handler.js';
import { ValidateLeadImportHandler } from '../../application/import/validate-lead-import.handler.js';
import { CreateLeadTagHandler } from '../../application/tags/create-lead-tag.handler.js';
import { ListLeadTagsHandler } from '../../application/tags/list-lead-tags.handler.js';
import {
  crmLeadBulkActionResponseSchema,
  toOpenApiSchema,
} from '../../../presentation/http/dto/crm.schemas.js';
import { CrmExceptionFilter } from '../../../presentation/http/filters/crm-exception.filter.js';
import { CrmContext } from '../../../presentation/http/guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../../../presentation/http/guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../../../presentation/http/guards/crm-organization.guard.js';
import { toCrmActor } from '../../../presentation/http/mappers/crm-actor.mapper.js';
import { toCrmClient } from '../../../presentation/http/mappers/crm-response.mapper.js';
import {
  changeLeadStageBodySchema,
  createLeadActivityBodySchema,
  createLeadBodySchema,
  crmLeadActivityResponseSchema,
  crmLeadConvertResponseSchema,
  crmLeadListResponseSchema,
  crmLeadResponseSchema,
  linkLeadToClientRequestSchema,
  updateLeadBodySchema,
} from '../dto/lead.dto.js';
import {
  toCrmLeadActivityFromReadModel,
  toCrmLeadFromReadModel,
} from '../mappers/lead-response.mapper.js';

const parseDateOnly = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
};

const parseDateTime = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
};

@ApiTags('CRM leads')
@ApiBearerAuth()
@Controller('crm/leads')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class LeadController {
  constructor(
    @Inject(ListLeadsHandler) private readonly listLeads: ListLeadsHandler,
    @Inject(GetLeadHandler) private readonly getLead: GetLeadHandler,
    @Inject(CreateLeadHandler) private readonly createLead: CreateLeadHandler,
    @Inject(UpdateLeadHandler) private readonly updateLead: UpdateLeadHandler,
    @Inject(DeleteLeadHandler) private readonly deleteLead: DeleteLeadHandler,
    @Inject(BulkDeleteLeadsHandler) private readonly bulkDeleteLeads: BulkDeleteLeadsHandler,
    @Inject(ChangeLeadStageHandler) private readonly changeLeadStage: ChangeLeadStageHandler,
    @Inject(ListLeadActivitiesHandler) private readonly listLeadActivities: ListLeadActivitiesHandler,
    @Inject(CreateLeadActivityHandler) private readonly createLeadActivity: CreateLeadActivityHandler,
    @Inject(ConvertLeadHandler) private readonly convertLead: ConvertLeadHandler,
    @Inject(LinkLeadToClientHandler) private readonly linkLeadToClient: LinkLeadToClientHandler,
    @Inject(ListLeadTagsHandler) private readonly listLeadTags: ListLeadTagsHandler,
    @Inject(CreateLeadTagHandler) private readonly createLeadTag: CreateLeadTagHandler,
    @Inject(ValidateLeadImportHandler) private readonly validateLeadImport: ValidateLeadImportHandler,
    @Inject(ExecuteLeadImportHandler) private readonly executeLeadImport: ExecuteLeadImportHandler,
  ) {}

  @Get()
  @RequirePermissions('leads.read')
  @ApiOperation({ summary: 'List and filter leads' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmLeadListResponse> {
    const query = parseLeadListQuery(request.query);
    const result = await this.listLeads.execute({
      actor: toCrmActor(ctx),
      filters: query,
    });
    return {
      items: result.items.map(toCrmLeadFromReadModel),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get('tags')
  @RequirePermissions('leads.read')
  @ApiOperation({ summary: 'List organization lead tags' })
  async listTags(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmLeadTagListResponse> {
    const search = typeof request.query.search === 'string' ? request.query.search : undefined;
    const items = await this.listLeadTags.execute({
      organizationId: ctx.organizationId,
      search,
    });
    return {
      items: items.map(
        (tag): CrmLeadTag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
        }),
      ),
    };
  }

  @Post('tags')
  @RequirePermissions('leads.update')
  @ApiOperation({ summary: 'Create a lead tag' })
  async createTag(
    @CrmContext() ctx: CrmRequestContext,
    @Body() body: CreateLeadTagRequest,
  ): Promise<CrmLeadTag> {
    const parsed = createLeadTagRequestSchema.parse(body);
    const tag = await this.createLeadTag.execute({
      organizationId: ctx.organizationId,
      data: parsed,
    });
    return { id: tag.id, name: tag.name, slug: tag.slug, color: tag.color };
  }

  @Post('import/validate')
  @RequirePermissions('leads.create')
  @ApiOperation({ summary: 'Validate lead import rows' })
  async validateImport(
    @CrmContext() ctx: CrmRequestContext,
    @Body() body: unknown,
  ): Promise<CrmLeadImportPreviewResponse> {
    const parsed = validateLeadImportRequestSchema.parse(body);
    return this.validateLeadImport.execute({
      actor: toCrmActor(ctx),
      pipelineId: parsed.pipelineId,
      rows: parsed.rows,
    });
  }

  @Post('import')
  @RequirePermissions('leads.create')
  @ApiOperation({ summary: 'Import validated lead rows' })
  async importLeads(
    @CrmContext() ctx: CrmRequestContext,
    @Body() body: unknown,
  ): Promise<CrmLeadImportResponse> {
    const parsed = executeLeadImportRequestSchema.parse(body);
    return this.executeLeadImport.execute({
      actor: toCrmActor(ctx),
      pipelineId: parsed.pipelineId,
      rows: parsed.rows,
    });
  }

  @Post('bulk/delete')
  @RequirePermissions('leads.delete')
  @ApiOperation({ summary: 'Permanently delete multiple leads' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadBulkActionResponseSchema) })
  async bulkDelete(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<CrmLeadBulkActionResponse> {
    const body = bulkLeadIdsRequestSchema.parse(raw);
    return this.bulkDeleteLeads.execute({
      actor: toCrmActor(ctx),
      leadIds: body.leadIds,
    });
  }

  @Get(':leadId')
  @RequirePermissions('leads.read')
  @ApiOperation({ summary: 'Get a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLead> {
    const result = await this.getLead.execute({ actor: toCrmActor(ctx), leadId });
    return toCrmLeadFromReadModel(result.lead);
  }

  @Post()
  @RequirePermissions('leads.create')
  @ApiOperation({ summary: 'Create a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createLeadBodySchema }) body: CreateLeadRequest,
  ): Promise<CrmLead> {
    const result = await this.createLead.execute({
      actor: toCrmActor(ctx),
      input: {
        ...body,
        expectedCloseDate: parseDateOnly(body.expectedCloseDate),
        nextFollowUpDate: parseDateTime(body.nextFollowUpDate),
      },
    });
    return toCrmLeadFromReadModel(result.lead);
  }

  @Patch(':leadId')
  @RequirePermissions('leads.update')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: updateLeadBodySchema }) body: UpdateLeadRequest,
  ): Promise<CrmLead> {
    const result = await this.updateLead.execute({
      actor: toCrmActor(ctx),
      leadId,
      input: {
        ...body,
        expectedCloseDate: parseDateOnly(body.expectedCloseDate),
        nextFollowUpDate: parseDateTime(body.nextFollowUpDate),
      },
    });
    return toCrmLeadFromReadModel(result.lead);
  }

  @Delete(':leadId')
  @RequirePermissions('leads.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a lead' })
  @ApiNoContentResponse()
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<void> {
    await this.deleteLead.execute({ actor: toCrmActor(ctx), leadId });
  }

  @Patch(':leadId/stage')
  @RequirePermissions('leads.update')
  @ApiOperation({ summary: 'Move a lead to another stage (kanban)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async changeStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: changeLeadStageBodySchema }) body: ChangeLeadStageRequest,
  ): Promise<CrmLead> {
    const result = await this.changeLeadStage.execute({
      actor: toCrmActor(ctx),
      leadId,
      stageId: body.stageId,
      beforeLeadId: body.beforeLeadId,
    });
    return toCrmLeadFromReadModel(result.lead);
  }

  @Get(':leadId/activities')
  @RequirePermissions('leads.read')
  @ApiOperation({ summary: 'List lead activities' })
  @ApiOkResponse({
    schema: toOpenApiSchema(z.object({ activities: z.array(crmLeadActivityResponseSchema) })),
  })
  async listActivities(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLeadActivityListResponse> {
    const result = await this.listLeadActivities.execute({
      actor: toCrmActor(ctx),
      leadId,
    });
    return { activities: result.activities.map(toCrmLeadActivityFromReadModel) };
  }

  @Post(':leadId/activities')
  @RequirePermissions('leads.update')
  @ApiOperation({ summary: 'Log a lead activity' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadActivityResponseSchema) })
  async createActivity(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: createLeadActivityBodySchema }) body: CreateLeadActivityRequest,
  ): Promise<CrmLeadActivity> {
    const result = await this.createLeadActivity.execute({
      actor: toCrmActor(ctx),
      leadId,
      input: {
        ...body,
        occurredAt: new Date(body.occurredAt),
        dueAt: parseDateTime(body.dueAt),
        completedAt: parseDateTime(body.completedAt),
      },
    });
    return toCrmLeadActivityFromReadModel(result.activity);
  }

  @Post(':leadId/convert')
  @RequirePermissions('leads.update', 'clients.create')
  @ApiOperation({ summary: 'Convert lead to client (idempotent)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadConvertResponseSchema) })
  async convert(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLeadConvertResponse> {
    const result = await this.convertLead.execute({ actor: toCrmActor(ctx), leadId });
    return {
      lead: toCrmLeadFromReadModel(result.lead),
      client: result.client ? toCrmClient(result.client) : null,
      duplicateClient: result.duplicateClient,
    };
  }

  @Post(':leadId/link-client')
  @RequirePermissions('leads.update', 'clients.create')
  @ApiOperation({ summary: 'Link lead to an existing client (same phone)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadConvertResponseSchema) })
  async linkClient(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: linkLeadToClientRequestSchema }) body: LinkLeadToClientRequest,
  ): Promise<CrmLeadConvertResponse> {
    const result = await this.linkLeadToClient.execute({
      actor: toCrmActor(ctx),
      leadId,
      clientId: body.clientId,
    });
    return {
      lead: toCrmLeadFromReadModel(result.lead),
      client: toCrmClient(result.client),
      duplicateClient: null,
    };
  }
}
