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
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CrmProposal,
  CrmProposalListResponse,
  CrmProposalPrintResponse,
  ProposalDocumentCodePreviewResponse,
} from '@techwin/contracts';
import {
  parseProposalListQuery,
  proposalDocumentTypeSchema,
  type ChangeProposalStatusRequest,
  type CreateProposalRequest,
  type UpdateProposalRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { ChangeProposalStatusHandler } from '../../../application/change-proposal-status/change-proposal-status.handler.js';
import { CreateProposalHandler } from '../../../application/create-proposal/create-proposal.handler.js';
import { DeleteProposalHandler } from '../../../application/delete-proposal/delete-proposal.handler.js';
import { GetProposalHandler } from '../../../application/get-proposal/get-proposal.handler.js';
import { GetProposalPrintDataHandler } from '../../../application/get-proposal-print-data/get-proposal-print-data.handler.js';
import { ListProposalsHandler } from '../../../application/list-proposals/list-proposals.handler.js';
import { PreviewProposalDocumentNumberHandler } from '../../../application/preview-proposal-document-number/preview-proposal-document-number.handler.js';
import { UpdateProposalHandler } from '../../../application/update-proposal/update-proposal.handler.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  changeProposalStatusBodySchema,
  createProposalBodySchema,
  crmProposalResponseSchema,
  toOpenApiSchema,
  updateProposalBodySchema,
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
import { toCrmProposal, toCrmProposalPrint } from '../mappers/crm-response.mapper.js';
import {
  toCreateProposalInput,
  toUpdateProposalInput,
} from '../mappers/proposal-request.mapper.js';

const crmProposalListResponseSchema = z.object({
  items: z.array(crmProposalResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

@ApiTags('CRM proposals')
@ApiBearerAuth()
@Controller('crm/proposals')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class ProposalsController {
  constructor(
    @Inject(ListProposalsHandler) private readonly listProposals: ListProposalsHandler,
    @Inject(PreviewProposalDocumentNumberHandler)
    private readonly previewProposalDocumentNumber: PreviewProposalDocumentNumberHandler,
    @Inject(GetProposalHandler) private readonly getProposal: GetProposalHandler,
    @Inject(CreateProposalHandler) private readonly createProposal: CreateProposalHandler,
    @Inject(UpdateProposalHandler) private readonly updateProposal: UpdateProposalHandler,
    @Inject(DeleteProposalHandler) private readonly deleteProposal: DeleteProposalHandler,
    @Inject(ChangeProposalStatusHandler)
    private readonly changeProposalStatus: ChangeProposalStatusHandler,
    @Inject(GetProposalPrintDataHandler)
    private readonly getProposalPrintData: GetProposalPrintDataHandler,
  ) {}

  @RequirePermissions('leads.read')
  @Get()
  @ApiOperation({ summary: 'List proposals and quotations' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmProposalListResponse> {
    const query = parseProposalListQuery(request.query);
    const result = await this.listProposals.execute({
      actor: toCrmActor(ctx),
      filters: query,
    });
    return {
      items: result.items.map(toCrmProposal),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @RequirePermissions('leads.read')
  @Get('code-preview')
  @ApiOperation({ summary: 'Preview next document number (not reserved until create)' })
  @ApiOkResponse({
    schema: toOpenApiSchema(
      z.object({
        documentNumber: z.string(),
        type: proposalDocumentTypeSchema,
        isPreview: z.literal(true),
      }),
    ),
  })
  async previewCode(
    @CrmContext() ctx: CrmRequestContext,
    @Query('type') typeRaw?: string,
  ): Promise<ProposalDocumentCodePreviewResponse> {
    const type = proposalDocumentTypeSchema.parse(typeRaw ?? 'QUOTATION');
    const documentNumber = await this.previewProposalDocumentNumber.execute({
      actor: toCrmActor(ctx),
      type,
    });
    return { documentNumber, type, isPreview: true };
  }

  @RequirePermissions('leads.read')
  @Get(':proposalId')
  @ApiOperation({ summary: 'Get a proposal' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<CrmProposal> {
    const proposal = await this.getProposal.execute({
      actor: toCrmActor(ctx),
      proposalId,
    });
    return toCrmProposal(proposal);
  }

  @RequirePermissions('leads.create')
  @Post()
  @ApiOperation({ summary: 'Create a proposal or quotation' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createProposalBodySchema }) body: CreateProposalRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.createProposal.execute({
      actor: toCrmActor(ctx),
      input: toCreateProposalInput(body, ctx.adminId),
    });
    return toCrmProposal(proposal);
  }

  @RequirePermissions('leads.update')
  @Patch(':proposalId')
  @ApiOperation({ summary: 'Update a draft proposal' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
    @Body({ schema: updateProposalBodySchema }) body: UpdateProposalRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.updateProposal.execute({
      actor: toCrmActor(ctx),
      proposalId,
      input: toUpdateProposalInput(body),
    });
    return toCrmProposal(proposal);
  }

  @RequirePermissions('leads.delete')
  @Delete(':proposalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a draft proposal' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<void> {
    await this.deleteProposal.execute({ actor: toCrmActor(ctx), proposalId });
  }

  @RequirePermissions('leads.update')
  @Post(':proposalId/status')
  @ApiOperation({ summary: 'Transition proposal status' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
    @Body({ schema: changeProposalStatusBodySchema }) body: ChangeProposalStatusRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.changeProposalStatus.execute({
      actor: toCrmActor(ctx),
      proposalId,
      toStatus: body.status,
      note: body.note ?? '',
    });
    return toCrmProposal(proposal);
  }

  @RequirePermissions('leads.read')
  @Get(':proposalId/print')
  @ApiOperation({ summary: 'Print-ready proposal payload' })
  @ApiOkResponse({
    schema: toOpenApiSchema(crmProposalResponseSchema.extend({ organizationName: z.string() })),
  })
  async print(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<CrmProposalPrintResponse> {
    const proposal = await this.getProposalPrintData.execute({
      actor: toCrmActor(ctx),
      proposalId,
    });
    return toCrmProposalPrint(proposal);
  }
}
