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
import type {
  CrmProposal,
  CrmProposalListResponse,
  CrmProposalPrintResponse,
} from '@techwin/contracts';
import type {
  ChangeProposalStatusRequest,
  CreateProposalRequest,
  UpdateProposalRequest,
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

const parseDateOnly = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
};

@ApiTags('CRM proposals')
@ApiBearerAuth()
@Controller('crm/proposals')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
@UseFilters(CrmExceptionFilter)
export class ProposalsController {
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @Get()
  @ApiOperation({ summary: 'List proposals and quotations' })
  @ApiOkResponse({
    schema: toOpenApiSchema(z.object({ proposals: z.array(crmProposalResponseSchema) })),
  })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmProposalListResponse> {
    const proposals = await this.crm.listProposals(ctx);
    return { proposals: proposals.map(toCrmProposal) };
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
    const proposal = await this.crm.createProposal(ctx, {
      ...body,
      issueDate: new Date(`${body.issueDate}T00:00:00.000Z`),
      expiryDate: parseDateOnly(body.expiryDate),
    });
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
    const proposal = await this.crm.updateProposal(ctx, proposalId, {
      ...body,
      issueDate: body.issueDate ? new Date(`${body.issueDate}T00:00:00.000Z`) : undefined,
      expiryDate: parseDateOnly(body.expiryDate),
    });
    return toCrmProposal(proposal);
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
