import { Inject, Injectable } from '@nestjs/common';
import type {
  EmployeeLeaveBalanceItem,
  EmployeeLeaveBalanceListResponse,
  GenerateEmployeeBalancesResponse,
  LeavePreviewDaysResponse,
  LeaveRequestItem,
  LeaveRequestListResponse,
  LeaveYearAllocationItem,
  LeaveYearAllocationListResponse,
  LeaveYearConfigurationItem,
} from '@techwin/contracts';
import type {
  AdjustEmployeeLeaveBalanceRequest,
  ApplyLeaveRequest,
  CreateLeaveYearAllocationRequest,
  CreateLeaveBalanceConfigurationRequest,
  CreateLeaveYearConfigurationRequest,
  UpdateLeaveBalanceConfigurationRequest,
  EmployeeLeaveBalanceListQuery,
  LeaveAllocationListQuery,
  LeaveBalanceTransactionListQuery,
  LeaveRequestListQuery,
  PreviewLeaveDaysQuery,
  UpdateLeaveYearAllocationRequest,
  UpdateLeaveYearConfigurationRequest,
  UpdateLeaveYearConfigurationStatusRequest,
} from '@techwin/validation';
import type { OrgAccessActor } from '../../org-access/index.js';
import {
  LEAVE_REPOSITORY,
  type LeaveBalanceTransactionListResponse,
  type LeaveRepository,
} from '../domain/repositories/leave.repository.js';
import { LeaveAuthorizationService } from './services/leave-authorization.service.js';
import { resolveLeaveRequestDates } from '../domain/policies/leave-request-dates.policy.js';
import { LeaveDayCalculationService } from './services/leave-day-calculation.service.js';

@Injectable()
export class ListLeaveYearConfigurationsHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor): Promise<readonly LeaveYearConfigurationItem[]> {
    await this.authz.requireAnyPermission(actor, ['leave.config.read', 'leave.config.manage']);
    return this.repository.listYearConfigurations(actor.organizationId);
  }
}

@Injectable()
export class GetLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, id: string): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.read', 'leave.config.manage']);
    return this.repository.getYearConfiguration(actor.organizationId, id);
  }

  async executeByYear(
    actor: OrgAccessActor,
    calendarYear: number,
  ): Promise<LeaveYearConfigurationItem | null> {
    await this.authz.requireAnyPermission(actor, ['leave.config.read', 'leave.config.manage']);
    return this.repository.getYearConfigurationByYear(actor.organizationId, calendarYear);
  }
}

@Injectable()
export class CreateLeaveBalanceConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: CreateLeaveBalanceConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage', 'leave.allocations.manage']);
    return this.repository.createLeaveBalanceConfiguration(actor.organizationId, actor.adminId, input);
  }
}

@Injectable()
export class UpdateLeaveBalanceConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    id: string,
    input: UpdateLeaveBalanceConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage', 'leave.allocations.manage']);
    return this.repository.updateLeaveBalanceConfiguration(
      actor.organizationId,
      id,
      actor.adminId,
      input,
    );
  }
}

@Injectable()
export class DeleteLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, id: string): Promise<void> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    await this.repository.deleteYearConfiguration(actor.organizationId, id);
  }
}

@Injectable()
export class CreateLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: CreateLeaveYearConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    return this.repository.createYearConfiguration(actor.organizationId, actor.adminId, input);
  }
}

@Injectable()
export class UpdateLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    id: string,
    input: UpdateLeaveYearConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    return this.repository.updateYearConfiguration(actor.organizationId, id, actor.adminId, input);
  }
}

@Injectable()
export class ActivateLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, id: string): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    return this.repository.activateYearConfiguration(actor.organizationId, id, actor.adminId);
  }
}

@Injectable()
export class CloseLeaveYearConfigurationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, id: string): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    return this.repository.closeYearConfiguration(actor.organizationId, id, actor.adminId);
  }
}

@Injectable()
export class SetLeaveYearConfigurationStatusHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    id: string,
    input: UpdateLeaveYearConfigurationStatusRequest,
  ): Promise<LeaveYearConfigurationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage']);
    return this.repository.setYearConfigurationStatus(
      actor.organizationId,
      id,
      actor.adminId,
      input,
    );
  }
}

@Injectable()
export class GenerateEmployeeLeaveBalancesHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, id: string): Promise<GenerateEmployeeBalancesResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.config.manage', 'leave.allocations.manage']);
    return this.repository.generateEmployeeBalances(actor.organizationId, id, actor.adminId);
  }
}

@Injectable()
export class ListLeaveAllocationsHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: LeaveAllocationListQuery,
  ): Promise<LeaveYearAllocationListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.allocations.read', 'leave.allocations.manage']);
    return this.repository.listAllocations(actor.organizationId, query);
  }
}

@Injectable()
export class CreateLeaveAllocationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: CreateLeaveYearAllocationRequest,
  ): Promise<LeaveYearAllocationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.allocations.manage']);
    return this.repository.createAllocation(actor.organizationId, actor.adminId, input);
  }
}

@Injectable()
export class UpdateLeaveAllocationHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    allocationId: string,
    input: UpdateLeaveYearAllocationRequest,
  ): Promise<LeaveYearAllocationItem> {
    await this.authz.requireAnyPermission(actor, ['leave.allocations.manage']);
    return this.repository.updateAllocation(
      actor.organizationId,
      allocationId,
      actor.adminId,
      input,
    );
  }
}

@Injectable()
export class ListEmployeeLeaveBalancesHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: EmployeeLeaveBalanceListQuery,
  ): Promise<EmployeeLeaveBalanceListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.balances.read']);
    return this.repository.listEmployeeBalances(actor.organizationId, query);
  }
}

@Injectable()
export class GetEmployeeLeaveBalanceHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, balanceId: string): Promise<EmployeeLeaveBalanceItem> {
    await this.authz.requireAnyPermission(actor, ['leave.balances.read', 'leave.balances.adjust']);
    return this.repository.getEmployeeBalance(actor.organizationId, balanceId);
  }
}

@Injectable()
export class AdjustEmployeeLeaveBalanceHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    balanceId: string,
    input: AdjustEmployeeLeaveBalanceRequest,
  ): Promise<EmployeeLeaveBalanceItem> {
    await this.authz.requireAnyPermission(actor, ['leave.balances.adjust']);
    return this.repository.adjustEmployeeBalance(
      actor.organizationId,
      balanceId,
      actor.adminId,
      input,
    );
  }
}

@Injectable()
export class ListLeaveBalanceTransactionsHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: LeaveBalanceTransactionListQuery,
  ): Promise<LeaveBalanceTransactionListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.balances.read', 'leave.balances.adjust']);
    return this.repository.listBalanceTransactions(actor.organizationId, query);
  }
}

@Injectable()
export class ListLeaveRequestsHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, query: LeaveRequestListQuery): Promise<LeaveRequestListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.read_all']);
    return this.repository.listLeaveRequests(actor.organizationId, query, {});
  }
}

@Injectable()
export class GetLeaveRequestHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, requestId: string): Promise<LeaveRequestItem> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.read_all']);
    return this.repository.getLeaveRequest(actor.organizationId, requestId, {});
  }
}

@Injectable()
export class GetMyLeaveBalancesHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: EmployeeLeaveBalanceListQuery,
  ): Promise<EmployeeLeaveBalanceListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.balances.read_own', 'leave.balances.read']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.listMyEmployeeLeaveBalances(
      actor.organizationId,
      employeeId,
      actor.adminId,
      query,
    );
  }
}

@Injectable()
export class ListMyLeaveRequestsHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, query: LeaveRequestListQuery): Promise<LeaveRequestListResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.read_own', 'leave.requests.read_all']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.listLeaveRequests(actor.organizationId, query, { employeeId });
  }
}

@Injectable()
export class GetMyLeaveRequestHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, requestId: string): Promise<LeaveRequestItem> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.read_own']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.getLeaveRequest(actor.organizationId, requestId, { employeeId });
  }
}

@Injectable()
export class PreviewLeaveDaysHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
    private readonly leaveDays: LeaveDayCalculationService,
  ) {}

  async execute(actor: OrgAccessActor, query: PreviewLeaveDaysQuery): Promise<LeavePreviewDaysResponse> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.create']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    const applicationDateKey = await this.leaveDays.resolveApplicationDateKey(actor.organizationId);
    const policyWindow = await this.repository.getActiveLeavePolicyWindow(
      actor.organizationId,
      applicationDateKey,
    );
    return this.leaveDays.preview(
      actor.organizationId,
      employeeId,
      query.startDate,
      query.endDate,
      query.selectedDates,
      query.isHalfDay,
      query.halfDayDate ?? null,
      undefined,
      policyWindow,
      query.skipDuration,
    );
  }
}

@Injectable()
export class ApplyForLeaveHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
    private readonly leaveDays: LeaveDayCalculationService,
  ) {}

  async execute(actor: OrgAccessActor, input: ApplyLeaveRequest): Promise<LeaveRequestItem> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.create']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    const applicationDateKey = await this.leaveDays.resolveApplicationDateKey(actor.organizationId);
    const policyWindow = await this.repository.getActiveLeavePolicyWindow(
      actor.organizationId,
      applicationDateKey,
    );
    const resolved = resolveLeaveRequestDates({
      selectedDates: input.selectedDates,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
      halfDayDate: input.halfDayDate ?? null,
    });
    await this.leaveDays.assertLeaveRequestDates(
      actor.organizationId,
      employeeId,
      resolved,
      undefined,
      policyWindow,
    );
    const totalDays = await this.leaveDays.countLeaveDaysForSelectedDates(
      actor.organizationId,
      employeeId,
      resolved.selectedDates,
      input.isHalfDay,
      resolved.halfDayDate,
    );
    return this.repository.applyForLeave(
      actor.organizationId,
      employeeId,
      actor.adminId,
      input,
      totalDays,
    );
  }
}

@Injectable()
export class CancelLeaveRequestHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, requestId: string, reason: string): Promise<LeaveRequestItem> {
    const canReadAll = await this.authz.hasPermission(actor, 'leave.requests.read_all');
    if (canReadAll) {
      await this.authz.requireAnyPermission(actor, ['leave.requests.cancel']);
      return this.repository.cancelLeaveRequest(
        actor.organizationId,
        requestId,
        actor.adminId,
        reason,
        {},
      );
    }
    await this.authz.requireAnyPermission(actor, ['leave.requests.cancel']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.cancelLeaveRequest(
      actor.organizationId,
      requestId,
      actor.adminId,
      reason,
      { employeeId },
    );
  }
}

@Injectable()
export class ApproveLeaveRequestHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    @Inject(LeaveAuthorizationService) private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, requestId: string): Promise<LeaveRequestItem> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.approve']);
    return this.repository.approveLeaveRequest(actor.organizationId, requestId, actor.adminId);
  }
}

@Injectable()
export class RejectLeaveRequestHandler {
  constructor(
    @Inject(LEAVE_REPOSITORY) private readonly repository: LeaveRepository,
    @Inject(LeaveAuthorizationService) private readonly authz: LeaveAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    requestId: string,
    rejectionReason: string,
  ): Promise<LeaveRequestItem> {
    await this.authz.requireAnyPermission(actor, ['leave.requests.reject']);
    return this.repository.rejectLeaveRequest(
      actor.organizationId,
      requestId,
      actor.adminId,
      rejectionReason,
    );
  }
}
