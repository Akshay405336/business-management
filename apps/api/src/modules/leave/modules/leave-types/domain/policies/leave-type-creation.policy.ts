import type { CreateLeaveTypeRequest } from '@techwin/validation';
import { generateLeaveTypeCodeFromName } from './leave-type-code-generation.policy.js';
import type { CreateLeaveTypeData } from '../types/leave-type.types.js';

export class LeaveTypeCreationPolicy {
  static validate(input: CreateLeaveTypeRequest): CreateLeaveTypeData & { generatedCode: string } {
    const name = input.name.trim();
    return {
      name,
      description: input.description,
      kind: input.kind,
      generatedCode: generateLeaveTypeCodeFromName(name),
    };
  }
}
