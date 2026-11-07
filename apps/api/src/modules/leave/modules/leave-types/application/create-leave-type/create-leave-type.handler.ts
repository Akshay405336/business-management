import { Inject, Injectable } from '@nestjs/common';
import type { LeaveTypeItem } from '@techwin/contracts';
import type { CreateLeaveTypeRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import { LeaveConflictError } from '../../../../domain/errors/leave.errors.js';
import { LeaveAuthorizationService } from '../../../../application/services/leave-authorization.service.js';
import { allocateUniqueLeaveTypeCode } from '../../domain/policies/leave-type-code-generation.policy.js';
import { LeaveTypeCreationPolicy } from '../../domain/policies/leave-type-creation.policy.js';
import {
  LEAVE_TYPE_REPOSITORY,
  type LeaveTypeRepository,
} from '../../domain/repositories/leave-type.repository.js';

@Injectable()
export class CreateLeaveTypeHandler {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY) private readonly leaveTypes: LeaveTypeRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, input: CreateLeaveTypeRequest): Promise<LeaveTypeItem> {
    await this.authz.requireAnyPermission(actor, ['leave.types.create', 'leave.types.manage']);
    const validated = LeaveTypeCreationPolicy.validate(input);
    const existingNameId = await this.leaveTypes.findIdByNameInsensitive(
      actor.organizationId,
      validated.name,
    );
    if (existingNameId) {
      throw new LeaveConflictError('A leave type with this name already exists.');
    }
    const existingCodes = await this.leaveTypes.listCodes(actor.organizationId);
    const code = allocateUniqueLeaveTypeCode(validated.generatedCode, new Set(existingCodes));
    return this.leaveTypes.createLeaveType(actor.organizationId, actor.adminId, validated, code);
  }
}
