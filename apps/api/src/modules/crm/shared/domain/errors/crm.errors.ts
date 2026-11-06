export type CrmErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'FORBIDDEN'
  | 'INVALID_STATUS_TRANSITION'
  | 'STAGE_DELETE_BLOCKED'
  | 'PIPELINE_HAS_DEPENDENT_LEADS'
  | 'TAG_IN_USE';

export abstract class CrmError extends Error {
  abstract readonly code: CrmErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CrmNotFoundError extends CrmError {
  readonly code = 'NOT_FOUND';
  constructor(readonly entity: string) {
    super(`${entity} was not found.`);
  }
}

export class CrmConflictError extends CrmError {
  readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

export class CrmValidationError extends CrmError {
  readonly code = 'VALIDATION_FAILED';
  constructor(
    message: string,
    readonly details?: readonly { path: string; message: string }[],
  ) {
    super(message);
  }
}

export class CrmForbiddenError extends CrmError {
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
  }
}

export class CrmInvalidStatusTransitionError extends CrmError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  constructor(from: string, to: string) {
    super(`Cannot change proposal status from ${from} to ${to}.`);
  }
}

export class CrmStageDeleteBlockedError extends CrmError {
  readonly code = 'STAGE_DELETE_BLOCKED';
  constructor(message: string) {
    super(message);
  }
}

export class CrmPipelineHasDependentLeadsError extends CrmError {
  readonly code = 'PIPELINE_HAS_DEPENDENT_LEADS';

  constructor(readonly leadCount: number) {
    super(
      leadCount === 1
        ? 'This pipeline cannot be deleted because 1 lead is associated with it.'
        : `This pipeline cannot be deleted because ${leadCount} leads are associated with it.`,
    );
  }
}

export class CrmTagInUseError extends CrmError {
  readonly code = 'TAG_IN_USE';

  constructor(readonly leadCount: number) {
    super(
      leadCount === 1
        ? 'This tag cannot be deleted because it is assigned to 1 lead.'
        : `This tag cannot be deleted because it is assigned to ${leadCount} leads.`,
    );
  }
}

/** @deprecated Use {@link CrmPipelineHasDependentLeadsError}. */
export const CrmPipelineInUseError = CrmPipelineHasDependentLeadsError;
