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
  CrmLeadListResponse,
} from '@techwin/contracts';
import {
  parseLeadListQuery,
  type ChangeLeadStageRequest,
  type CreateLeadActivityRequest,
  type CreateLeadRequest,
  type UpdateLeadRequest,
} from '@techwin/validation';
import { CrmUseCases } from '../../../application/crm-use-cases.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  changeLeadStageBodySchema,
  createLeadActivityBodySchema,
  createLeadBodySchema,
  crmLeadActivityResponseSchema,
  crmLeadListResponseSchema,
  crmLeadResponseSchema,
  toOpenApiSchema,
  updateLeadBodySchema,
} from '../dto/crm.schemas.js';
import { CrmExceptionFilter } from '../filters/crm-exception.filter.js';
import { CrmContext } from '../guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../guards/crm-organization.guard.js';
import { toCrmClient, toCrmLead, toCrmLeadActivity } from '../mappers/crm-response.mapper.js';
import { z } from 'zod';

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
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
@UseFilters(CrmExceptionFilter)
export class LeadsController {
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @Get()
  @ApiOperation({ summary: 'List and filter leads' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmLeadListResponse> {
    const query = parseLeadListQuery(request.query);
    const result = await this.crm.listLeads(ctx, query);
    return {
      items: result.items.map(toCrmLead),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':leadId')
  @ApiOperation({ summary: 'Get a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLead> {
    const lead = await this.crm.getLead(ctx, leadId);
    return toCrmLead(lead);
  }

  @Post()
  @ApiOperation({ summary: 'Create a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createLeadBodySchema }) body: CreateLeadRequest,
  ): Promise<CrmLead> {
    const lead = await this.crm.createLead(ctx, {
      ...body,
      expectedCloseDate: parseDateOnly(body.expectedCloseDate),
      nextFollowUpDate: parseDateTime(body.nextFollowUpDate),
    });
    return toCrmLead(lead);
  }

  @Patch(':leadId')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: updateLeadBodySchema }) body: UpdateLeadRequest,
  ): Promise<CrmLead> {
    const lead = await this.crm.updateLead(ctx, leadId, {
      ...body,
      expectedCloseDate: parseDateOnly(body.expectedCloseDate),
      nextFollowUpDate: parseDateTime(body.nextFollowUpDate),
    });
    return toCrmLead(lead);
  }

  @Delete(':leadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a lead' })
  @ApiNoContentResponse()
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<void> {
    await this.crm.deleteLead(ctx, leadId);
  }

  @Patch(':leadId/stage')
  @ApiOperation({ summary: 'Move a lead to another stage (kanban)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadResponseSchema) })
  async changeStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: changeLeadStageBodySchema }) body: ChangeLeadStageRequest,
  ): Promise<CrmLead> {
    const lead = await this.crm.changeLeadStage(ctx, leadId, body.stageId, body.beforeLeadId);
    return toCrmLead(lead);
  }

  @Get(':leadId/activities')
  @ApiOperation({ summary: 'List lead activities' })
  @ApiOkResponse({
    schema: toOpenApiSchema(z.object({ activities: z.array(crmLeadActivityResponseSchema) })),
  })
  async listActivities(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLeadActivityListResponse> {
    const activities = await this.crm.listLeadActivities(ctx, leadId);
    return { activities: activities.map(toCrmLeadActivity) };
  }

  @Post(':leadId/activities')
  @ApiOperation({ summary: 'Log a lead activity' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadActivityResponseSchema) })
  async createActivity(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
    @Body({ schema: createLeadActivityBodySchema }) body: CreateLeadActivityRequest,
  ): Promise<CrmLeadActivity> {
    const activity = await this.crm.createLeadActivity(ctx, leadId, {
      ...body,
      occurredAt: new Date(body.occurredAt),
      dueAt: parseDateTime(body.dueAt),
      completedAt: parseDateTime(body.completedAt),
    });
    return toCrmLeadActivity(activity);
  }

  @Post(':leadId/convert')
  @ApiOperation({ summary: 'Convert lead to client (idempotent)' })
  @ApiOkResponse({
    schema: toOpenApiSchema(
      z.object({ lead: crmLeadResponseSchema, client: z.object({ id: z.uuid() }) }),
    ),
  })
  async convert(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLeadConvertResponse> {
    const result = await this.crm.convertLead(ctx, leadId);
    return { lead: toCrmLead(result.lead), client: toCrmClient(result.client) };
  }
}
