import { Inject, Injectable } from '@nestjs/common';
import type { LeaveTypeItem } from '@techwin/contracts';
import type { UpdateLeaveTypeRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import { LeaveConflictError } from '../../../../domain/errors/leave.errors.js';
import { LeaveAuthorizationService } from '../../../../application/services/leave-authorization.service.js';
import { LeaveTypeUpdatePolicy } from '../../domain/policies/leave-type-update.policy.js';
import {
  LEAVE_TYPE_REPOSITORY,
  type LeaveTypeRepository,
} from '../../domain/repositories/leave-type.repository.js';

@Injectable()
export class UpdateLeaveTypeHandler {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY) private readonly leaveTypes: LeaveTypeRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    leaveTypeId: string,
    input: UpdateLeaveTypeRequest,
  ): Promise<LeaveTypeItem> {
    await this.authz.requireAnyPermission(actor, ['leave.types.update', 'leave.types.manage']);
    const validated = LeaveTypeUpdatePolicy.validate(input);
    if (validated.name) {
      const existingNameId = await this.leaveTypes.findIdByNameInsensitive(
        actor.organizationId,
        validated.name,
        leaveTypeId,
      );
      if (existingNameId) {
        throw new LeaveConflictError('A leave type with this name already exists.');
      }
    }
    return this.leaveTypes.updateLeaveType(
      actor.organizationId,
      leaveTypeId,
      actor.adminId,
      validated,
    );
  }
}
