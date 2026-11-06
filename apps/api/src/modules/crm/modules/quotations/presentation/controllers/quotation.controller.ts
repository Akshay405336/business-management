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
  StreamableFile,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CrmQuotation,
  CrmQuotationListResponse,
  CrmQuotationPrintResponse,
  QuotationDocumentCodePreviewResponse,
} from '@techwin/contracts';
import {
  parseQuotationListQuery,
  quotationDocumentTypeSchema,
  type ChangeQuotationStatusRequest,
  type CreateQuotationRequest,
  type SendQuotationRequest,
  type UpdateQuotationRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { PlatformAdminGuard } from '../../../../../auth/index.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../../org-access/index.js';
import { ChangeQuotationStatusHandler } from '../../application/change-status/change-quotation-status.handler.js';
import { CreateQuotationHandler } from '../../application/create/create-quotation.handler.js';
import { DeleteQuotationHandler } from '../../application/delete/delete-quotation.handler.js';
import { GetPrintDataHandler } from '../../application/get-print-data/get-print-data.handler.js';
import { GetQuotationPdfHandler } from '../../application/get-pdf/get-quotation-pdf.handler.js';
import { GetQuotationHandler } from '../../application/get/get-quotation.handler.js';
import { SendQuotationHandler } from '../../application/send/send-quotation.handler.js';
import { ListQuotationsHandler } from '../../application/list/list-quotations.handler.js';
import { PreviewDocumentNumberHandler } from '../../application/preview-document-number/preview-document-number.handler.js';
import { UpdateQuotationHandler } from '../../application/update/update-quotation.handler.js';
import {
  crmQuotationListResponseSchema,
  crmQuotationResponseSchema,
  toOpenApiSchema,
} from '../../../../shared/presentation/http/dto/crm.schemas.js';
import { CrmExceptionFilter } from '../../../../shared/presentation/http/filters/crm-exception.filter.js';
import { CrmContext } from '../../../../shared/presentation/http/guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../../../../shared/presentation/http/guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../../../../shared/presentation/http/guards/crm-organization.guard.js';
import { toCrmActor } from '../../../../shared/presentation/http/mappers/crm-actor.mapper.js';
import {
  changeQuotationStatusBodySchema,
  createQuotationBodySchema,
  sendQuotationBodySchema,
  updateQuotationBodySchema,
} from '../dto/quotation.dto.js';
import {
  toCreateQuotationInput,
  toUpdateQuotationInput,
} from '../mappers/quotation-request.mapper.js';
import { toCrmQuotation, toCrmQuotationPrint } from '../mappers/quotation-response.mapper.js';

@ApiTags('CRM quotations')
@ApiBearerAuth()
@Controller('crm/quotations')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class QuotationController {
  constructor(
    @Inject(ListQuotationsHandler) private readonly listQuotations: ListQuotationsHandler,
    @Inject(PreviewDocumentNumberHandler)
    private readonly previewDocumentNumber: PreviewDocumentNumberHandler,
    @Inject(GetQuotationHandler) private readonly getQuotation: GetQuotationHandler,
    @Inject(CreateQuotationHandler) private readonly createQuotation: CreateQuotationHandler,
    @Inject(UpdateQuotationHandler) private readonly updateQuotation: UpdateQuotationHandler,
    @Inject(DeleteQuotationHandler) private readonly deleteQuotation: DeleteQuotationHandler,
    @Inject(ChangeQuotationStatusHandler)
    private readonly changeQuotationStatus: ChangeQuotationStatusHandler,
    @Inject(GetPrintDataHandler) private readonly getPrintData: GetPrintDataHandler,
    @Inject(GetQuotationPdfHandler) private readonly getQuotationPdf: GetQuotationPdfHandler,
    @Inject(SendQuotationHandler) private readonly sendQuotation: SendQuotationHandler,
  ) {}

  @RequirePermissions('leads.read')
  @Get()
  @ApiOperation({ summary: 'List quotations' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<CrmQuotationListResponse> {
    const query = parseQuotationListQuery(request.query);
    const result = await this.listQuotations.execute({
      actor: toCrmActor(ctx),
      filters: query,
    });
    return {
      items: result.items.map(toCrmQuotation),
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
        type: quotationDocumentTypeSchema,
        isPreview: z.literal(true),
      }),
    ),
  })
  async previewCode(
    @CrmContext() ctx: CrmRequestContext,
    @Query('type') typeRaw?: string,
  ): Promise<QuotationDocumentCodePreviewResponse> {
    const type = quotationDocumentTypeSchema.parse(typeRaw ?? 'QUOTATION');
    const documentNumber = await this.previewDocumentNumber.execute({
      actor: toCrmActor(ctx),
      type,
    });
    return { documentNumber, type, isPreview: true };
  }

  @RequirePermissions('leads.read')
  @Get(':quotationId')
  @ApiOperation({ summary: 'Get a quotation' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
  ): Promise<CrmQuotation> {
    const quotation = await this.getQuotation.execute({
      actor: toCrmActor(ctx),
      quotationId,
    });
    return toCrmQuotation(quotation);
  }

  @RequirePermissions('leads.create')
  @Post()
  @ApiOperation({ summary: 'Create a quotation' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createQuotationBodySchema }) body: CreateQuotationRequest,
  ): Promise<CrmQuotation> {
    const quotation = await this.createQuotation.execute({
      actor: toCrmActor(ctx),
      input: toCreateQuotationInput(body),
    });
    return toCrmQuotation(quotation);
  }

  @RequirePermissions('leads.update')
  @Patch(':quotationId')
  @ApiOperation({ summary: 'Update a draft quotation' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
    @Body({ schema: updateQuotationBodySchema }) body: UpdateQuotationRequest,
  ): Promise<CrmQuotation> {
    const quotation = await this.updateQuotation.execute({
      actor: toCrmActor(ctx),
      quotationId,
      input: toUpdateQuotationInput(body),
    });
    return toCrmQuotation(quotation);
  }

  @RequirePermissions('leads.delete')
  @Delete(':quotationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a draft quotation' })
  async delete(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
  ): Promise<void> {
    await this.deleteQuotation.execute({ actor: toCrmActor(ctx), quotationId });
  }

  @RequirePermissions('leads.update')
  @Patch(':quotationId/status')
  @ApiOperation({ summary: 'Transition quotation status' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationResponseSchema) })
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
    @Body({ schema: changeQuotationStatusBodySchema }) body: ChangeQuotationStatusRequest,
  ): Promise<CrmQuotation> {
    const quotation = await this.changeQuotationStatus.execute({
      actor: toCrmActor(ctx),
      quotationId,
      toStatus: body.status,
      note: body.note ?? '',
    });
    return toCrmQuotation(quotation);
  }

  @RequirePermissions('leads.read')
  @Get(':quotationId/print/pdf')
  @ApiOperation({ summary: 'Quotation PDF document' })
  async printPdf(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.getQuotationPdf.execute({
      actor: toCrmActor(ctx),
      quotationId,
    });
    return new StreamableFile(pdf.bytes, {
      type: pdf.contentType,
      disposition: `inline; filename="${pdf.filename}"`,
    });
  }

  @RequirePermissions('leads.update')
  @Post(':quotationId/send')
  @ApiOperation({ summary: 'Email quotation PDF to recipients' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmQuotationResponseSchema) })
  async send(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
    @Body({ schema: sendQuotationBodySchema }) body: SendQuotationRequest,
  ): Promise<CrmQuotation> {
    const quotation = await this.sendQuotation.execute({
      actor: toCrmActor(ctx),
      quotationId,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      bodyText: body.bodyText,
    });
    return toCrmQuotation(quotation);
  }

  @RequirePermissions('leads.read')
  @Get(':quotationId/print')
  @ApiOperation({ summary: 'Print-ready quotation payload' })
  @ApiOkResponse({
    schema: toOpenApiSchema(crmQuotationResponseSchema.extend({ organizationName: z.string() })),
  })
  async print(
    @CrmContext() ctx: CrmRequestContext,
    @Param('quotationId') quotationId: string,
  ): Promise<CrmQuotationPrintResponse> {
    const quotation = await this.getPrintData.execute({
      actor: toCrmActor(ctx),
      quotationId,
    });
    return toCrmQuotationPrint(quotation);
  }
}
