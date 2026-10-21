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
import { CrmUseCases } from '../../../application/crm-use-cases.js';
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
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
@UseFilters(CrmExceptionFilter)
export class ProposalsController {
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @Get()
  @ApiOperation({ summary: 'List proposals and quotations' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmProposalListResponse> {
    const query = parseProposalListQuery(request.query);
    const result = await this.crm.listProposals(ctx, query);
    return {
      items: result.items.map(toCrmProposal),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

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
    const documentNumber = await this.crm.previewProposalDocumentNumber(ctx, type);
    return { documentNumber, type, isPreview: true };
  }

  @Get(':proposalId')
  @ApiOperation({ summary: 'Get a proposal' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<CrmProposal> {
    const proposal = await this.crm.getProposal(ctx, proposalId);
    return toCrmProposal(proposal);
  }

  @Post()
  @ApiOperation({ summary: 'Create a proposal or quotation' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createProposalBodySchema }) body: CreateProposalRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.crm.createProposal(
      ctx,
      toCreateProposalInput(body, ctx.adminId),
    );
    return toCrmProposal(proposal);
  }

  @Patch(':proposalId')
  @ApiOperation({ summary: 'Update a draft proposal' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
    @Body({ schema: updateProposalBodySchema }) body: UpdateProposalRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.crm.updateProposal(
      ctx,
      proposalId,
      toUpdateProposalInput(body),
    );
    return toCrmProposal(proposal);
  }

  @Delete(':proposalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a draft proposal' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<void> {
    await this.crm.deleteProposal(ctx, proposalId);
  }

  @Post(':proposalId/status')
  @ApiOperation({ summary: 'Transition proposal status' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmProposalResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
    @Body({ schema: changeProposalStatusBodySchema }) body: ChangeProposalStatusRequest,
  ): Promise<CrmProposal> {
    const proposal = await this.crm.changeProposalStatus(
      ctx,
      proposalId,
      body.status,
      body.note ?? '',
    );
    return toCrmProposal(proposal);
  }

  @Get(':proposalId/print')
  @ApiOperation({ summary: 'Print-ready proposal payload' })
  @ApiOkResponse({
    schema: toOpenApiSchema(crmProposalResponseSchema.extend({ organizationName: z.string() })),
  })
  async print(
    @CrmContext() ctx: CrmRequestContext,
    @Param('proposalId') proposalId: string,
  ): Promise<CrmProposalPrintResponse> {
    const proposal = await this.crm.getProposalPrintData(ctx, proposalId);
    return toCrmProposalPrint(proposal);
  }
}
