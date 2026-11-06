import { LeadValidationError } from '../errors/lead.errors.js';

export type LeadPipelineContext = {
  readonly pipelineId: string;
  readonly pipelineStatus: 'ACTIVE' | 'INACTIVE';
};

export type LeadStageContext = {
  readonly stageId: string;
  readonly pipelineId: string;
  readonly stageStatus: 'ACTIVE' | 'INACTIVE';
};

export class LeadPipelineStagePolicy {
  static assertActivePipelineForAssignment(pipeline: LeadPipelineContext): void {
    if (pipeline.pipelineStatus !== 'ACTIVE') {
      throw new LeadValidationError('Leads can only be assigned to an active pipeline.');
    }
  }

  static assertActivePipelineForCreate(pipeline: LeadPipelineContext): void {
    if (pipeline.pipelineStatus !== 'ACTIVE') {
      throw new LeadValidationError('Leads can only be created in an active pipeline.');
    }
  }

  static assertStageBelongsToPipeline(
    stage: LeadStageContext,
    expectedPipelineId: string,
  ): void {
    if (stage.pipelineId !== expectedPipelineId) {
      throw new LeadValidationError('The stage does not belong to the selected pipeline.');
    }
  }

  static assertActiveStage(stage: LeadStageContext): void {
    if (stage.stageStatus !== 'ACTIVE') {
      throw new LeadValidationError('Leads can only be assigned to active pipeline stages.');
    }
  }

  static assertStageMoveTarget(
    leadPipelineId: string,
    targetStage: LeadStageContext,
  ): void {
    LeadPipelineStagePolicy.assertStageBelongsToPipeline(targetStage, leadPipelineId);
    LeadPipelineStagePolicy.assertActiveStage(targetStage);
  }
}
