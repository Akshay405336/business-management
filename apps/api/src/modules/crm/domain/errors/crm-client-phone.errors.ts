import { CrmError } from './crm.errors.js';

/** Thrown when lead conversion matches an existing client by normalized phone. */
export class CrmDuplicateClientPhoneError extends CrmError {
  readonly code = 'CONFLICT' as const;
  constructor(
    readonly summary: {
      readonly id: string;
      readonly name: string;
      readonly referenceNumber: string;
      readonly type: 'INDIVIDUAL' | 'COMPANY';
      readonly phone: string | null;
    },
  ) {
    super('A client with this phone number already exists.');
    this.name = 'CrmDuplicateClientPhoneError';
  }
}
