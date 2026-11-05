import type { PipelineStatus } from '../enums/pipeline-status.enum.js';
import { PipelineName } from '../value-objects/pipeline-name.vo.js';
import type { PipelineReadModel } from '../types/pipeline-read-model.js';
import type { CreatePipelineData, UpdatePipelineData } from '../types/pipeline.types.js';
import { PipelineStage, type PipelineStageProps } from './pipeline-stage.entity.js';
import {
  PipelineHasDependentLeadsError,
  PipelineValidationError,
} from '../errors/pipeline.errors.js';
import { PipelineStageName } from '../value-objects/pipeline-stage-name.vo.js';

export type PipelineProps = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly status: PipelineStatus;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly leadCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly stages: readonly PipelineStage[];
};

export class Pipeline {
  private constructor(private readonly props: PipelineProps) {}

  static reconstitute(props: Omit<PipelineProps, 'stages'> & { stages: readonly PipelineStageProps[] }): Pipeline {
    return new Pipeline({
      ...props,
      stages: props.stages.map((stage) => PipelineStage.reconstitute(stage)),
    });
  }

  static validateCreate(input: CreatePipelineData): CreatePipelineData {
    PipelineName.create(input.name);
    if (!input.stages.length) {
      throw new PipelineValidationError('At least one stage is required.');
    }
    for (const stage of input.stages) {
      PipelineStageName.create(stage.name);
    }
    return input;
  }

  static validateUpdate(input: UpdatePipelineData): UpdatePipelineData {
    if (input.name !== undefined) {
      PipelineName.create(input.name);
    }
    if (input.stages !== undefined && input.stages.length === 0) {
      throw new PipelineValidationError('At least one stage is required.');
    }
    return input;
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get leadCount(): number {
    return this.props.leadCount;
  }

  get status(): PipelineStatus {
    return this.props.status;
  }

  assertCanDelete(): void {
    if (this.props.isDefault) {
      throw new PipelineValidationError('The default pipeline cannot be deleted.');
    }
    if (this.props.leadCount > 0) {
      throw new PipelineHasDependentLeadsError(this.props.leadCount);
    }
  }

  changeStatus(status: PipelineStatus): PipelineStatus {
    return status;
  }

  toReadModel(): PipelineReadModel {
    const stages = this.props.stages.map((stage) => stage.toReadModel());
    const leadCount =
      this.props.leadCount > 0
        ? this.props.leadCount
        : stages.reduce((sum, stage) => sum + stage.leadCount, 0);
    return {
      id: this.props.id,
      organizationId: this.props.organizationId,
      name: this.props.name,
      description: this.props.description,
      status: this.props.status,
      isDefault: this.props.isDefault,
      sortOrder: this.props.sortOrder,
      leadCount,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      stages,
    };
  }
}
