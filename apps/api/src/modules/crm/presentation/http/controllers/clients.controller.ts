import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CrmClient, CrmClientListResponse, CrmLeadConvertResponse } from '@techwin/contracts';
import type { CreateClientRequest, UpdateClientRequest } from '@techwin/validation';
import { z } from 'zod';
import { CrmUseCases } from '../../../application/crm-use-cases.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  createClientBodySchema,
  crmClientResponseSchema,
  crmLeadResponseSchema,
  toOpenApiSchema,
  updateClientBodySchema,
} from '../dto/crm.schemas.js';
import { CrmExceptionFilter } from '../filters/crm-exception.filter.js';
import { CrmContext } from '../guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../guards/crm-organization.guard.js';
import { toCrmClient, toCrmLead } from '../mappers/crm-response.mapper.js';

@ApiTags('CRM clients')
@ApiBearerAuth()
@Controller('crm/clients')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
@UseFilters(CrmExceptionFilter)
export class ClientsController {
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({
    schema: toOpenApiSchema(z.object({ clients: z.array(crmClientResponseSchema) })),
  })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmClientListResponse> {
    const clients = await this.crm.listClients(ctx);
    return { clients: clients.map(toCrmClient) };
  }

  @Post('from-lead/:leadId')
  @ApiOperation({ summary: 'Convert a lead into a client' })
  @ApiOkResponse({
    schema: toOpenApiSchema(
      z.object({ lead: crmLeadResponseSchema, client: crmClientResponseSchema }),
    ),
  })
  async fromLead(
    @CrmContext() ctx: CrmRequestContext,
    @Param('leadId') leadId: string,
  ): Promise<CrmLeadConvertResponse> {
    const result = await this.crm.convertLeadToClient(ctx, leadId);
    return { lead: toCrmLead(result.lead), client: toCrmClient(result.client) };
  }

  @Get(':clientId')
  @ApiOperation({ summary: 'Get a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
  ): Promise<CrmClient> {
    const client = await this.crm.getClient(ctx, clientId);
    return toCrmClient(client);
  }

  @Post()
  @ApiOperation({ summary: 'Create a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createClientBodySchema }) body: CreateClientRequest,
  ): Promise<CrmClient> {
    const client = await this.crm.createClient(ctx, body);
    return toCrmClient(client);
  }

  @Patch(':clientId')
  @ApiOperation({ summary: 'Update a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
    @Body({ schema: updateClientBodySchema }) body: UpdateClientRequest,
  ): Promise<CrmClient> {
    const client = await this.crm.updateClient(ctx, clientId, body);
    return toCrmClient(client);
  }
}
