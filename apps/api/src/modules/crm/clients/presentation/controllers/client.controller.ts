import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CrmClient, CrmClientListResponse, CrmLeadConvertResponse } from '@techwin/contracts';
import {
  parseClientListQuery,
  type CreateClientRequest,
  type UpdateClientRequest,
  type ChangeClientStatusRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';
import { ConvertLeadHandler } from '../../../leads/index.js';
import { CrmExceptionFilter } from '../../../presentation/http/filters/crm-exception.filter.js';
import { CrmContext } from '../../../presentation/http/guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../../../presentation/http/guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../../../presentation/http/guards/crm-organization.guard.js';
import { toCrmActor } from '../../../presentation/http/mappers/crm-actor.mapper.js';
import { toCrmLeadFromReadModel } from '../../../leads/presentation/mappers/lead-response.mapper.js';
import { ChangeClientStatusHandler } from '../../application/change-status/change-client-status.handler.js';
import { CreateClientHandler } from '../../application/create/create-client.handler.js';
import { DeleteClientHandler } from '../../application/delete/delete-client.handler.js';
import { GetClientHandler } from '../../application/get/get-client.handler.js';
import { ListClientsHandler } from '../../application/list/list-clients.handler.js';
import { PreviewClientReferenceHandler } from '../../application/preview-reference/preview-client-reference.handler.js';
import { UpdateClientHandler } from '../../application/update/update-client.handler.js';
import {
  changeClientStatusBodySchema,
  createClientBodySchema,
  crmClientResponseSchema,
  crmLeadConvertResponseSchema,
  updateClientBodySchema,
} from '../dto/client.dto.js';
import {
  toChangeClientStatusInput,
  toCreateClientInput,
  toUpdateClientInput,
} from '../mappers/client-request.mapper.js';
import { toCrmClient } from '../mappers/client-response.mapper.js';
import { toOpenApiSchema } from '../../../presentation/http/dto/crm.schemas.js';

@ApiTags('CRM clients')
@ApiBearerAuth()
@Controller('crm/clients')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class ClientController {
  constructor(
    @Inject(ListClientsHandler) private readonly listClients: ListClientsHandler,
    @Inject(ConvertLeadHandler) private readonly convertLead: ConvertLeadHandler,
    @Inject(PreviewClientReferenceHandler)
    private readonly previewClientReference: PreviewClientReferenceHandler,
    @Inject(GetClientHandler) private readonly getClient: GetClientHandler,
    @Inject(CreateClientHandler) private readonly createClient: CreateClientHandler,
    @Inject(UpdateClientHandler) private readonly updateClient: UpdateClientHandler,
    @Inject(DeleteClientHandler) private readonly deleteClient: DeleteClientHandler,
    @Inject(ChangeClientStatusHandler)
    private readonly changeClientStatus: ChangeClientStatusHandler,
  ) {}

  @Get()
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({
    schema: toOpenApiSchema(
      z.object({
        clients: z.array(crmClientResponseSchema),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
      }),
    ),
  })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmClientListResponse> {
    const filters = parseClientListQuery(request.query);
    const page = await this.listClients.execute({ actor: toCrmActor(ctx), filters });
    return {
      clients: page.items.map(toCrmClient),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  @Post('from-lead/:leadId')
  @RequirePermissions('clients.create', 'leads.update')
  @ApiOperation({ summary: 'Convert a lead into a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmLeadConvertResponseSchema) })
  async fromLead(
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

  @Get('reference-preview')
  @RequirePermissions('clients.create')
  @ApiOperation({ summary: 'Preview the next client reference number (not reserved until create)' })
  @ApiOkResponse({
    schema: toOpenApiSchema(
      z.object({ referenceNumber: z.string(), isPreview: z.literal(true) }),
    ),
  })
  async previewReference(@CrmContext() ctx: CrmRequestContext) {
    const referenceNumber = await this.previewClientReference.execute({
      actor: toCrmActor(ctx),
    });
    return { referenceNumber, isPreview: true as const };
  }

  @Get(':clientId')
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'Get a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
  ): Promise<CrmClient> {
    const result = await this.getClient.execute({ actor: toCrmActor(ctx), clientId });
    return toCrmClient(result.client);
  }

  @Post()
  @RequirePermissions('clients.create')
  @ApiOperation({ summary: 'Create a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createClientBodySchema }) body: CreateClientRequest,
  ): Promise<CrmClient> {
    const result = await this.createClient.execute({
      actor: toCrmActor(ctx),
      input: toCreateClientInput(body),
    });
    return toCrmClient(result.client);
  }

  @Patch(':clientId/status')
  @RequirePermissions('clients.update')
  @ApiOperation({ summary: 'Change client status' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
    @Body({ schema: changeClientStatusBodySchema }) body: ChangeClientStatusRequest,
  ): Promise<CrmClient> {
    const result = await this.changeClientStatus.execute({
      actor: toCrmActor(ctx),
      clientId,
      status: toChangeClientStatusInput(body),
    });
    return toCrmClient(result.client);
  }

  @Patch(':clientId')
  @RequirePermissions('clients.update')
  @ApiOperation({ summary: 'Update a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
    @Body({ schema: updateClientBodySchema }) body: UpdateClientRequest,
  ): Promise<CrmClient> {
    const result = await this.updateClient.execute({
      actor: toCrmActor(ctx),
      clientId,
      input: toUpdateClientInput(body),
    });
    return toCrmClient(result.client);
  }

  @Delete(':clientId')
  @RequirePermissions('clients.delete')
  @ApiOperation({ summary: 'Permanently delete a client' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('clientId') clientId: string,
  ): Promise<void> {
    await this.deleteClient.execute({ actor: toCrmActor(ctx), clientId });
  }
}
