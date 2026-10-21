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
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { CrmPipeline, CrmPipelineListResponse, CrmPipelineStage } from '@techwin/contracts';
import type {
  CreatePipelineStageRequest,
  CreatePipelineRequest,
  ReorderPipelineStagesRequest,
  UpdatePipelineRequest,
  UpdatePipelineStageRequest,
} from '@techwin/validation';
import { z } from 'zod';
import { CrmUseCases } from '../../../application/crm-use-cases.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  createPipelineBodySchema,
  createStageBodySchema,
  crmPipelineListResponseSchema,
  crmPipelineResponseSchema,
  crmPipelineStageResponseSchema,
  deleteStageBodySchema,
  reorderStagesBodySchema,
  toOpenApiSchema,
  updatePipelineBodySchema,
  updateStageBodySchema,
} from '../dto/crm.schemas.js';
import { CrmExceptionFilter } from '../filters/crm-exception.filter.js';
import { CrmContext } from '../guards/crm-context.decorator.js';
import type { CrmRequestContext } from '../guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../guards/crm-organization.guard.js';
import { toCrmPipeline, toCrmPipelineStage } from '../mappers/crm-response.mapper.js';

@ApiTags('CRM pipelines')
@ApiBearerAuth()
@Controller('crm/pipelines')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
@UseFilters(CrmExceptionFilter)
export class PipelineController {
  constructor(@Inject(CrmUseCases) private readonly crm: CrmUseCases) {}

  @Get()
  @ApiOperation({ summary: 'List pipelines for the current organization' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineListResponseSchema) })
  async list(@CrmContext() ctx: CrmRequestContext): Promise<CrmPipelineListResponse> {
    const pipelines = await this.crm.listPipelines(ctx);
    return { pipelines: pipelines.map(toCrmPipeline) };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get the organization default pipeline with stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async getDefault(@CrmContext() ctx: CrmRequestContext): Promise<CrmPipeline> {
    const pipeline = await this.crm.getDefaultPipeline(ctx);
    return toCrmPipeline(pipeline);
  }

  @Get(':pipelineId')
  @ApiOperation({ summary: 'Get a pipeline with stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
  ): Promise<CrmPipeline> {
    const pipeline = await this.crm.getPipeline(ctx, pipelineId);
    return toCrmPipeline(pipeline);
  }

  @Post()
  @ApiOperation({ summary: 'Create a pipeline with default stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body({ schema: createPipelineBodySchema }) body: CreatePipelineRequest,
  ): Promise<CrmPipeline> {
    const pipeline = await this.crm.createPipeline(ctx, body);
    return toCrmPipeline(pipeline);
  }

  @Patch(':pipelineId')
  @ApiOperation({ summary: 'Update pipeline metadata' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Body({ schema: updatePipelineBodySchema }) body: UpdatePipelineRequest,
  ): Promise<CrmPipeline> {
    const pipeline = await this.crm.updatePipeline(ctx, pipelineId, body);
    return toCrmPipeline(pipeline);
  }

  @Delete(':pipelineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty pipeline' })
  @ApiNoContentResponse()
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
  ): Promise<void> {
    await this.crm.deletePipeline(ctx, pipelineId);
  }

  @Post(':pipelineId/stages/reorder')
  @ApiOperation({ summary: 'Reorder stages within a pipeline' })
  @ApiOkResponse({ schema: toOpenApiSchema(z.array(crmPipelineStageResponseSchema)) })
  async reorderStages(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Body({ schema: reorderStagesBodySchema }) body: ReorderPipelineStagesRequest,
  ): Promise<readonly CrmPipelineStage[]> {
    const stages = await this.crm.reorderStages(ctx, pipelineId, body.orderedStageIds);
    return stages.map(toCrmPipelineStage);
  }

  @Post(':pipelineId/stages')
  @ApiOperation({ summary: 'Add a pipeline stage' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async createStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Body({ schema: createStageBodySchema }) body: CreatePipelineStageRequest,
  ): Promise<CrmPipelineStage> {
    const stage = await this.crm.createStage(ctx, pipelineId, body);
    return toCrmPipelineStage(stage);
  }

  @Patch(':pipelineId/stages/:stageId')
  @ApiOperation({ summary: 'Update a pipeline stage' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async updateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: updateStageBodySchema }) body: UpdatePipelineStageRequest,
  ): Promise<CrmPipelineStage> {
    const stage = await this.crm.updateStage(ctx, pipelineId, stageId, body);
    return toCrmPipelineStage(stage);
  }

  @Post(':pipelineId/stages/:stageId/activate')
  @ApiOperation({ summary: 'Activate a pipeline stage (appends to end of active order)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async activateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
  ): Promise<CrmPipelineStage> {
    const stage = await this.crm.activateStage(ctx, pipelineId, stageId);
    return toCrmPipelineStage(stage);
  }

  @Post(':pipelineId/stages/:stageId/deactivate')
  @ApiOperation({ summary: 'Deactivate a pipeline stage (reassign leads when required)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async deactivateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: deleteStageBodySchema }) body: { targetStageId?: string },
  ): Promise<CrmPipelineStage> {
    const stage = await this.crm.deactivateStage(ctx, pipelineId, stageId, body.targetStageId);
    return toCrmPipelineStage(stage);
  }

  @Delete(':pipelineId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a stage (reassign leads when required)' })
  @ApiNoContentResponse()
  async deleteStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: deleteStageBodySchema }) body: { targetStageId?: string },
  ): Promise<void> {
    await this.crm.deleteStage(ctx, pipelineId, stageId, body.targetStageId);
  }
}
