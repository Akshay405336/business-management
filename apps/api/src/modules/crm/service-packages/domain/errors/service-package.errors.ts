export {
  CrmNotFoundError as ServicePackageNotFoundError,
  CrmConflictError as ServicePackageConflictError,
  CrmValidationError as ServicePackageValidationError,
} from '../../../domain/errors/crm.errors.js';

export class ServicePackageDeletionNotAllowedError extends Error {
  constructor(message = 'This service package cannot be deleted while it is referenced by proposals.') {
    super(message);
    this.name = 'ServicePackageDeletionNotAllowedError';
  }
}
