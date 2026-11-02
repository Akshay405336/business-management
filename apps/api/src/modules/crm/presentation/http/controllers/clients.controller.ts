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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CrmClient, CrmClientListResponse, CrmLeadConvertResponse } from '@techwin/contracts';
import type { CreateClientRequest, UpdateClientRequest } from '@techwin/validation';
import { z } from 'zod';
import { ConvertLeadHandler } from '../../../application/convert-lead/convert-lead.handler.js';
import { CreateClientHandler } from '../../../application/create-client/create-client.handler.js';
import { DeleteClientHandler } from '../../../application/delete-client/delete-client.handler.js';
import { GetClientHandler } from '../../../application/get-client/get-client.handler.js';
import { ListClientsHandler } from '../../../application/list-clients/list-clients.handler.js';
import { PreviewClientReferenceHandler } from '../../../application/preview-client-reference/preview-client-reference.handler.js';
import { UpdateClientHandler } from '../../../application/update-client/update-client.handler.js';
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
import { toCrmActor } from '../mappers/crm-actor.mapper.js';
import { toCrmClient, toCrmLead } from '../mappers/crm-response.mapper.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../org-access/index.js';

@ApiTags('CRM clients')
@ApiBearerAuth()
@Controller('crm/clients')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class ClientsController {
  constructor(
    @Inject(ListClientsHandler) private readonly listClients: ListClientsHandler,
    @Inject(ConvertLeadHandler) private readonly convertLead: ConvertLeadHandler,
    @Inject(PreviewClientReferenceHandler)
    private readonly previewClientReference: PreviewClientReferenceHandler,
    @Inject(GetClientHandler) private readonly getClient: GetClientHandler,
    @Inject(CreateClientHandler) private readonly createClient: CreateClientHandler,
    @Inject(UpdateClientHandler) private readonly updateClient: UpdateClientHandler,
    @Inject(DeleteClientHandler) private readonly deleteClient: DeleteClientHandler,
  ) {}

  @Get()
  @RequirePermissions('clients.read')
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({
    schema: toOpenApiSchema(z.object({ clients: z.array(crmClientResponseSchema) })),
  })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmClientListResponse> {
    const clients = await this.listClients.execute({ actor: toCrmActor(ctx) });
    return { clients: clients.map(toCrmClient) };
  }

  @Post('from-lead/:leadId')
  @RequirePermissions('clients.create', 'leads.update')
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
    const result = await this.convertLead.execute({ actor: toCrmActor(ctx), leadId });
    return { lead: toCrmLead(result.lead), client: toCrmClient(result.client) };
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
    const client = await this.getClient.execute({ actor: toCrmActor(ctx), clientId });
    return toCrmClient(client);
  }

  @Post()
  @RequirePermissions('clients.create')
  @ApiOperation({ summary: 'Create a client' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmClientResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createClientBodySchema }) body: CreateClientRequest,
  ): Promise<CrmClient> {
    const client = await this.createClient.execute({ actor: toCrmActor(ctx), input: body });
    return toCrmClient(client);
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
    const client = await this.updateClient.execute({
      actor: toCrmActor(ctx),
      clientId,
      input: body,
    });
    return toCrmClient(client);
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
