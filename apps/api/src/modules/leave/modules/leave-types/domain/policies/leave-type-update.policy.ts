import type { UpdateLeaveTypeRequest } from '@techwin/validation';
import { LeaveValidationError } from '../../../../domain/errors/leave.errors.js';
import type { UpdateLeaveTypeData } from '../types/leave-type.types.js';

export class LeaveTypeUpdatePolicy {
  static validate(input: UpdateLeaveTypeRequest): UpdateLeaveTypeData {
    if (input.name === undefined && input.description === undefined && input.kind === undefined) {
      throw new LeaveValidationError('Provide at least one field to update.');
    }
    return {
      name: input.name,
      description: input.description,
      kind: input.kind,
    };
  }
}
