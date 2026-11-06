export type ProjectErrorCode = 'NOT_FOUND' | 'VALIDATION_FAILED' | 'PROJECT_PLAN_LOCKED';

export abstract class ProjectError extends Error {
  abstract readonly code: ProjectErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProjectNotFoundError extends ProjectError {
  readonly code = 'NOT_FOUND';
  constructor(readonly entity: string) {
    super(`${entity} was not found.`);
  }
}

export class ProjectValidationError extends ProjectError {
  readonly code = 'VALIDATION_FAILED';
  constructor(message: string) {
    super(message);
  }
}

export class ProjectPlanLockedError extends ProjectError {
  readonly code = 'PROJECT_PLAN_LOCKED';
  constructor(message: string) {
    super(message);
  }
}
