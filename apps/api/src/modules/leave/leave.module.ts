import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { OrganizationCalendarModule } from '../organization-calendar/index.js';
import {
  ActivateLeaveYearConfigurationHandler,
  CloseLeaveYearConfigurationHandler,
  AdjustEmployeeLeaveBalanceHandler,
  ApplyForLeaveHandler,
  ApproveLeaveRequestHandler,
  CancelLeaveRequestHandler,
  CreateLeaveAllocationHandler,
  CreateLeaveTypeHandler,
  CreateLeaveBalanceConfigurationHandler,
  CreateLeaveYearConfigurationHandler,
  DeleteLeaveTypeHandler,
  DeleteLeaveYearConfigurationHandler,
  GenerateEmployeeLeaveBalancesHandler,
  GetEmployeeLeaveBalanceHandler,
  GetLeaveRequestHandler,
  GetLeaveTypeHandler,
  GetLeaveYearConfigurationHandler,
  GetMyLeaveRequestHandler,
  GetMyLeaveBalancesHandler,
  ListEmployeeLeaveBalancesHandler,
  ListLeaveAllocationsHandler,
  ListLeaveBalanceTransactionsHandler,
  ListLeaveRequestsHandler,
  ListLeaveTypesHandler,
  ListLeaveYearConfigurationsHandler,
  ListMyLeaveRequestsHandler,
  PreviewLeaveDaysHandler,
  RejectLeaveRequestHandler,
  SetLeaveYearConfigurationStatusHandler,
  UpdateLeaveAllocationHandler,
  UpdateLeaveTypeHandler,
  UpdateLeaveBalanceConfigurationHandler,
  UpdateLeaveYearConfigurationHandler,
} from './application/leave.handlers.js';
import { LeaveAuthorizationService } from './application/services/leave-authorization.service.js';
import { LeaveDayCalculationService } from './application/services/leave-day-calculation.service.js';
import { LEAVE_REPOSITORY } from './domain/repositories/leave.repository.js';
import { PrismaLeaveRepository } from './infrastructure/persistence/prisma/repositories/prisma-leave.repository.js';
import { LeaveController } from './presentation/http/controllers/leave.controller.js';
import { LeaveExceptionFilter } from './presentation/http/filters/leave-exception.filter.js';

export const leavePersistenceProviders: Provider[] = [
  { provide: LEAVE_REPOSITORY, useClass: PrismaLeaveRepository },
];

const leaveHandlers = [
  LeaveAuthorizationService,
  LeaveDayCalculationService,
  ListLeaveTypesHandler,
  GetLeaveTypeHandler,
  CreateLeaveTypeHandler,
  UpdateLeaveTypeHandler,
  DeleteLeaveTypeHandler,
  ListLeaveYearConfigurationsHandler,
  GetLeaveYearConfigurationHandler,
  CreateLeaveYearConfigurationHandler,
  CreateLeaveBalanceConfigurationHandler,
  UpdateLeaveBalanceConfigurationHandler,
  DeleteLeaveYearConfigurationHandler,
  UpdateLeaveYearConfigurationHandler,
  ActivateLeaveYearConfigurationHandler,
  CloseLeaveYearConfigurationHandler,
  SetLeaveYearConfigurationStatusHandler,
  GenerateEmployeeLeaveBalancesHandler,
  ListLeaveAllocationsHandler,
  CreateLeaveAllocationHandler,
  UpdateLeaveAllocationHandler,
  ListEmployeeLeaveBalancesHandler,
  GetEmployeeLeaveBalanceHandler,
  AdjustEmployeeLeaveBalanceHandler,
  ListLeaveBalanceTransactionsHandler,
  ListLeaveRequestsHandler,
  GetLeaveRequestHandler,
  GetMyLeaveBalancesHandler,
  ListMyLeaveRequestsHandler,
  GetMyLeaveRequestHandler,
  PreviewLeaveDaysHandler,
  ApplyForLeaveHandler,
  CancelLeaveRequestHandler,
  ApproveLeaveRequestHandler,
  RejectLeaveRequestHandler,
] as const;

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule, OrganizationCalendarModule],
  controllers: [LeaveController],
  providers: [...leavePersistenceProviders, ...leaveHandlers, LeaveExceptionFilter],
  exports: [LEAVE_REPOSITORY, LeaveExceptionFilter],
})
export class LeaveModule {}
