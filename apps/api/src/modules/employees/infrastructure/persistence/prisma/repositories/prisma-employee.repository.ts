import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  MEMBER_ACCOUNT_TRANSACTION,
  type MemberAccountTransactionPort,
} from '../../../../../org-access/index.js';
import type {
  AssignableEmployeeRecord,
  CreateEmployeeInput,
  EmployeeDailyTaskDeletionImpact,
  EmployeeDeletionResult,
  EmployeeDeletionTarget,
  EmployeeEmploymentStatus,
  EmployeeListFilters,
  EmployeeRecord,
  EmployeeRepository,
  NewEmployeeLoginAccount,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../../../../domain/repositories/employee.repository.js';
import { EmployeePrismaStore } from '../stores/employee-prisma.store.js';

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepository {
  private readonly store: EmployeePrismaStore;

  constructor(
    prisma: PrismaService,
    @Inject(MEMBER_ACCOUNT_TRANSACTION) memberAccounts: MemberAccountTransactionPort,
  ) {
    this.store = new EmployeePrismaStore(prisma, memberAccounts);
  }

  listEmployees(organizationId: string, filters: EmployeeListFilters): Promise<PaginatedEmployees> {
    return this.store.listEmployees(organizationId, filters);
  }

  getEmployee(organizationId: string, employeeId: string): Promise<EmployeeRecord | null> {
    return this.store.getEmployee(organizationId, employeeId);
  }

  getProfileImageStoredObjectId(organizationId: string, employeeId: string): Promise<string | null> {
    return this.store.getProfileImageStoredObjectId(organizationId, employeeId);
  }

  previewEmployeeCode(organizationId: string): Promise<string> {
    return this.store.previewEmployeeCode(organizationId);
  }

  findEmployeeIdByWorkEmail(
    organizationId: string,
    workEmail: string,
    excludeEmployeeId?: string,
  ): Promise<string | null> {
    return this.store.findEmployeeIdByWorkEmail(organizationId, workEmail, excludeEmployeeId);
  }

  findEmployeeIdByPhone(
    organizationId: string,
    phone: string,
    excludeEmployeeId?: string,
  ): Promise<string | null> {
    return this.store.findEmployeeIdByPhone(organizationId, phone, excludeEmployeeId);
  }

  listAssignableEmployees(
    organizationId: string,
    search?: string,
  ): Promise<readonly AssignableEmployeeRecord[]> {
    return this.store.listAssignableEmployees(organizationId, search);
  }

  createEmployee(
    organizationId: string,
    employeeId: string,
    input: CreateEmployeeInput,
    adminId: string,
    loginAccount?: NewEmployeeLoginAccount | null,
  ): Promise<EmployeeRecord> {
    return this.store.createEmployee(organizationId, employeeId, input, adminId, loginAccount);
  }

  updateEmployee(
    organizationId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    adminId: string,
  ): Promise<EmployeeRecord> {
    return this.store.updateEmployee(organizationId, employeeId, input, adminId);
  }

  changeEmployeeStatus(
    organizationId: string,
    employeeId: string,
    status: EmployeeEmploymentStatus,
    adminId: string,
  ): Promise<EmployeeRecord> {
    return this.store.changeEmployeeStatus(organizationId, employeeId, status, adminId);
  }

  getDeletionTarget(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDeletionTarget | null> {
    return this.store.getDeletionTarget(organizationId, employeeId);
  }

  getDailyTaskDeletionImpact(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDailyTaskDeletionImpact> {
    return this.store.getDailyTaskDeletionImpact(organizationId, employeeId);
  }

  deleteEmployee(
    organizationId: string,
    employeeId: string,
    adminId: string,
  ): Promise<EmployeeDeletionResult> {
    return this.store.deleteEmployee(organizationId, employeeId, adminId);
  }
}
