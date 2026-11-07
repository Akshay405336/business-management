import { Inject, Injectable } from '@nestjs/common';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import { LeaveAuthorizationService } from '../../../../application/services/leave-authorization.service.js';
import { LeaveTypeDeletionPolicy } from '../../domain/policies/leave-type-deletion.policy.js';
import {
  LEAVE_TYPE_REPOSITORY,
  type LeaveTypeRepository,
} from '../../domain/repositories/leave-type.repository.js';

@Injectable()
export class DeleteLeaveTypeHandler {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY) private readonly leaveTypes: LeaveTypeRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, leaveTypeId: string): Promise<void> {
    await this.authz.requireAnyPermission(actor, ['leave.types.manage']);
    const counts = await this.leaveTypes.countDependencies(actor.organizationId, leaveTypeId);
    LeaveTypeDeletionPolicy.assertCanDelete(counts);
    await this.leaveTypes.deleteLeaveType(actor.organizationId, leaveTypeId);
  }
}
