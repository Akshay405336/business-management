import { Inject, Injectable } from '@nestjs/common';
import type { LeaveTypeListResponse } from '@techwin/contracts';
import type { LeaveTypeListQuery } from '@techwin/validation';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import { LeaveAuthorizationService } from '../../../../application/services/leave-authorization.service.js';
import {
  LEAVE_TYPE_REPOSITORY,
  type LeaveTypeRepository,
} from '../../domain/repositories/leave-type.repository.js';

@Injectable()
export class ListLeaveTypesHandler {
  constructor(
    @Inject(LEAVE_TYPE_REPOSITORY) private readonly leaveTypes: LeaveTypeRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, query: LeaveTypeListQuery): Promise<LeaveTypeListResponse> {
    await this.authz.requireAnyPermission(actor, [
      'leave.types.read',
      'leave.types.manage',
      'leave.requests.create',
    ]);
    return this.leaveTypes.listLeaveTypes(actor.organizationId, query);
  }
}
