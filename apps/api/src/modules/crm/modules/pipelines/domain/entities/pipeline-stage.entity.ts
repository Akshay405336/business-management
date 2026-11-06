import type { PipelineStageOutcome } from '../enums/pipeline-stage-outcome.enum.js';
import type { PipelineStatus } from '../enums/pipeline-status.enum.js';
import { PipelineStageDeleteBlockedError, PipelineValidationError } from '../errors/pipeline.errors.js';
import { PipelineStageName } from '../value-objects/pipeline-stage-name.vo.js';
import type { PipelineStageReadModel } from '../types/pipeline-read-model.js';

export type PipelineStageProps = {
  readonly id: string;
  readonly organizationId: string;
  readonly pipelineId: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly status: PipelineStatus;
  readonly sortOrder: number;
  readonly outcome: PipelineStageOutcome;
  readonly leadCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class PipelineStage {
  private constructor(private readonly props: PipelineStageProps) {}

  static reconstitute(props: PipelineStageProps): PipelineStage {
    return new PipelineStage(props);
  }

  get id(): string {
    return this.props.id;
  }

  get pipelineId(): string {
    return this.props.pipelineId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get status(): PipelineStatus {
    return this.props.status;
  }

  get outcome(): PipelineStageOutcome {
    return this.props.outcome;
  }

  get leadCount(): number {
    return this.props.leadCount;
  }

  get name(): string {
    return this.props.name;
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  isTerminal(): boolean {
    return this.props.outcome === 'WON' || this.props.outcome === 'LOST';
  }

  assertCanDeleteWithLeads(targetStageId: string | undefined): void {
    if (this.props.leadCount <= 0) return;
    if (this.isTerminal()) {
      throw new PipelineStageDeleteBlockedError(
        'Terminal stages with active leads cannot be deleted.',
      );
    }
    if (!targetStageId) {
      throw new PipelineValidationError(
        'targetStageId is required to reassign leads before deleting this stage.',
      );
    }
    if (targetStageId === this.props.id) {
      throw new PipelineValidationError('targetStageId must differ from the stage being deleted.');
    }
  }

  assertCanDeactivateWithLeads(targetStageId: string | undefined): void {
    if (this.props.leadCount <= 0) return;
    if (!targetStageId) {
      throw new PipelineValidationError(
        'targetStageId is required to reassign leads before deactivating this stage.',
      );
    }
    if (targetStageId === this.props.id) {
      throw new PipelineValidationError(
        'Choose another active stage to move leads before deactivating this stage.',
      );
    }
  }

  validateRename(name: string): void {
    PipelineStageName.create(name);
  }

  toReadModel(): PipelineStageReadModel {
    return { ...this.props };
  }
}
