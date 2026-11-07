import { Inject, Injectable } from '@nestjs/common';
import type { LeaveTypeItem } from '@techwin/contracts';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import { LeaveAuthorizationService } from '../../../../application/services/leave-authorization.service.js';
import {
  LEAVE_TYPE_REPOSITORY,
  type LeaveTypeRepository,
} from '../../domain/repositories/leave-type.repository.js';

@Injectable()
export class GetLeaveTypeHandler {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY) private readonly leaveTypes: LeaveTypeRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, leaveTypeId: string): Promise<LeaveTypeItem> {
    await this.authz.requireAnyPermission(actor, [
      'leave.types.read',
      'leave.types.manage',
      'leave.requests.create',
    ]);
    return this.leaveTypes.getLeaveType(actor.organizationId, leaveTypeId);
  }
}
