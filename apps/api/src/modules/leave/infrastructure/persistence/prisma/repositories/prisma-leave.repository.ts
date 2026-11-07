import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import type {
  CreateLeaveYearAllocationRequest,
  CreateLeaveBalanceConfigurationRequest,
  CreateLeaveYearConfigurationRequest,
  UpdateLeaveBalanceConfigurationRequest,
  EmployeeLeaveBalanceListQuery,
  EmployeeLeaveRecordsListQuery,
  LeaveAllocationListQuery,
  LeaveBalanceTransactionListQuery,
  LeaveRequestListQuery,
  UpdateLeaveYearAllocationRequest,
  UpdateLeaveYearConfigurationRequest,
  UpdateLeaveYearConfigurationStatusRequest,
  AdjustEmployeeLeaveBalanceRequest,
  ApplyLeaveRequest,
} from '@techwin/validation';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  LeaveConflictError,
  LeaveNotFoundError,
  LeaveValidationError,
} from '../../../../domain/errors/leave.errors.js';
import type {
  EmployeeLeaveBalanceAvailability,
  EmployeeLeaveBalanceListResponse,
  EmployeeLeaveRecordsResponse,
} from '@techwin/contracts';
import type { LeaveRepository } from '../../../../domain/repositories/leave.repository.js';
import { resolveLeaveRequestDates } from '../../../../domain/policies/leave-request-dates.policy.js';
import { LeaveBalanceDeletionPolicy } from '../../../../modules/leave-balances/domain/policies/leave-balance-deletion.policy.js';
import {
  assertAllocationReductionAllowed,
  assertLeaveTypeRemovalAllowed,
} from '../../../../modules/leave-balances/domain/policies/leave-balance-update.policy.js';
import type { LeaveBalanceDependencySnapshot } from '../../../../modules/leave-balances/domain/types/leave-balance-dependencies.js';
import {
  computeAvailableDays,
  parseDateOnly,
  parseLeaveDays,
  toEmployeeLeaveBalanceItem,
  toLeaveBalanceTransactionItem,
  toLeaveRequestItem,
  toLeaveYearAllocationItem,
  toLeaveYearConfigurationItem,
} from '../mappers/leave.mapper.js';
import { buildEmployeeLeaveRecordsResponse } from '../mappers/employee-leave-records.mapper.js';

type EmployeeRow = {
  id: string;
  department: string | null;
  employmentType: string;
};

@Injectable()
export class PrismaLeaveRepository implements LeaveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { email: true },
    });
    const adminEmail = admin?.email.trim().toLowerCase() ?? '';
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
        deactivatedAt: null,
        OR: [
          { platformAdminId: adminId },
          ...(adminEmail.length > 0
            ? [{ workEmail: { equals: adminEmail, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private yearConfigurationInclude() {
    return {
      allocations: {
        where: { isActive: true },
        include: { leaveType: true },
        orderBy: { createdAt: 'asc' },
      },
    } satisfies Prisma.LeaveYearConfigurationInclude;
  }

  async listYearConfigurations(organizationId: string) {
    const rows = await this.prisma.leaveYearConfiguration.findMany({
      where: { organizationId },
      include: this.yearConfigurationInclude(),
      orderBy: { yearStartDate: 'desc' },
    });
    return rows.map(toLeaveYearConfigurationItem);
  }

  async getYearConfiguration(organizationId: string, id: string) {
    const row = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id, organizationId },
      include: this.yearConfigurationInclude(),
    });
    if (!row) throw new LeaveNotFoundError('Leave year configuration');
    return toLeaveYearConfigurationItem(row);
  }

  async getYearConfigurationByYear(organizationId: string, calendarYear: number) {
    const row = await this.prisma.leaveYearConfiguration.findFirst({
      where: { organizationId, calendarYear },
      include: this.yearConfigurationInclude(),
    });
    return row ? toLeaveYearConfigurationItem(row) : null;
  }

  async createYearConfiguration(
    organizationId: string,
    adminId: string,
    input: CreateLeaveYearConfigurationRequest,
  ) {
    try {
      const row = await this.prisma.leaveYearConfiguration.create({
        data: {
          id: randomUUID(),
          organizationId,
          name: input.name?.trim() ?? '',
          calendarYear: input.calendarYear,
          yearStartDate: parseDateOnly(input.yearStartDate),
          yearEndDate: parseDateOnly(input.yearEndDate),
          createdByAdminId: adminId,
          updatedByAdminId: adminId,
        },
        include: this.yearConfigurationInclude(),
      });
      return toLeaveYearConfigurationItem(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError('A configuration for this calendar year already exists.');
      }
      throw error;
    }
  }

  async updateYearConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveYearConfigurationRequest,
  ) {
    await this.getYearConfiguration(organizationId, id);
    if (input.yearStartDate || input.yearEndDate) {
      const config = await this.prisma.leaveYearConfiguration.findFirst({
        where: { id, organizationId },
      });
      if (!config) throw new LeaveNotFoundError('Leave year configuration');
      const yearStart = input.yearStartDate ? parseDateOnly(input.yearStartDate) : config.yearStartDate;
      const yearEnd = input.yearEndDate ? parseDateOnly(input.yearEndDate) : config.yearEndDate;
      await this.assertConfigurationDatesAllowActiveRequests(
        organizationId,
        id,
        yearStart,
        yearEnd,
      );
    }
    const yearStart = input.yearStartDate
      ? parseDateOnly(input.yearStartDate)
      : undefined;
    const yearEnd = input.yearEndDate ? parseDateOnly(input.yearEndDate) : undefined;
    const row = await this.prisma.leaveYearConfiguration.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        calendarYear: yearStart ? yearStart.getUTCFullYear() : undefined,
        yearStartDate: yearStart,
        yearEndDate: yearEnd,
        updatedByAdminId: adminId,
      },
      include: this.yearConfigurationInclude(),
    });
    return toLeaveYearConfigurationItem(row);
  }

  async createLeaveBalanceConfiguration(
    organizationId: string,
    adminId: string,
    input: CreateLeaveBalanceConfigurationRequest,
  ) {
    const calendarYear = parseDateOnly(input.yearStartDate).getUTCFullYear();
    const yearStart = parseDateOnly(input.yearStartDate);
    const yearEnd = parseDateOnly(input.yearEndDate);
    const leaveTypeIds = [...new Set(input.allocations.map((line) => line.leaveTypeId))];
    const activeTypes = await this.prisma.leaveType.findMany({
      where: { organizationId, id: { in: leaveTypeIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (activeTypes.length !== leaveTypeIds.length) {
      throw new LeaveValidationError('One or more leave types are invalid or inactive.');
    }

    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const config = await tx.leaveYearConfiguration.create({
          data: {
            id: randomUUID(),
            organizationId,
            name: input.name.trim(),
            calendarYear,
            yearStartDate: yearStart,
            yearEndDate: yearEnd,
            status: 'ACTIVE',
            createdByAdminId: adminId,
            updatedByAdminId: adminId,
          },
        });

        for (const line of input.allocations) {
          await tx.leaveYearAllocation.create({
            data: {
              id: randomUUID(),
              organizationId,
              leaveYearConfigurationId: config.id,
              leaveTypeId: line.leaveTypeId,
              annualAllocationDays: parseLeaveDays(line.annualAllocationDays),
              accrualMethod: 'ANNUAL_FULL',
              carryForwardEnabled: false,
              maxCarryForwardDays: parseLeaveDays('0'),
              eligibility: 'ALL_EMPLOYEES',
              eligibleEmployeeIds: [],
              eligibleDepartments: [],
              eligibleEmploymentTypes: [],
              effectiveFrom: yearStart,
              effectiveTo: yearEnd,
              isActive: true,
              createdByAdminId: adminId,
              updatedByAdminId: adminId,
            },
          });
        }

        await tx.leaveYearConfiguration.update({
          where: { id: config.id },
          data: {
            activatedAt: new Date(),
            updatedByAdminId: adminId,
          },
        });

        const full = await tx.leaveYearConfiguration.findFirst({
          where: { id: config.id },
          include: this.yearConfigurationInclude(),
        });
        if (!full) throw new LeaveNotFoundError('Leave year configuration');
        return toLeaveYearConfigurationItem(full);
      });
      await this.generateEmployeeBalances(organizationId, item.id, adminId);
      return this.getYearConfiguration(organizationId, item.id);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError(
          'A leave balance configuration already exists for this calendar year.',
        );
      }
      throw error;
    }
  }

  async updateLeaveBalanceConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveBalanceConfigurationRequest,
  ) {
    const existing = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id, organizationId },
      include: { allocations: { include: { leaveType: true } } },
    });
    if (!existing) throw new LeaveNotFoundError('Leave year configuration');

    const yearStart = input.yearStartDate
      ? parseDateOnly(input.yearStartDate)
      : existing.yearStartDate;
    const yearEnd = input.yearEndDate ? parseDateOnly(input.yearEndDate) : existing.yearEndDate;
    const calendarYear = yearStart.getUTCFullYear();

    if (input.yearStartDate || input.yearEndDate) {
      await this.assertConfigurationDatesAllowActiveRequests(
        organizationId,
        id,
        yearStart,
        yearEnd,
      );
    }

    if (input.allocations) {
      const leaveTypeIds = [...new Set(input.allocations.map((line) => line.leaveTypeId))];
      const existingTypeIds = new Set(existing.allocations.map((row) => row.leaveTypeId));
      const newlyAddedTypeIds = leaveTypeIds.filter((typeId) => !existingTypeIds.has(typeId));
      if (newlyAddedTypeIds.length > 0) {
        const activeNewTypes = await this.prisma.leaveType.findMany({
          where: { organizationId, id: { in: newlyAddedTypeIds }, status: 'ACTIVE' },
          select: { id: true },
        });
        if (activeNewTypes.length !== newlyAddedTypeIds.length) {
          throw new LeaveValidationError('One or more leave types are invalid or inactive.');
        }
      }
      const knownTypes = await this.prisma.leaveType.findMany({
        where: { organizationId, id: { in: leaveTypeIds } },
        select: { id: true },
      });
      if (knownTypes.length !== leaveTypeIds.length) {
        throw new LeaveValidationError('One or more leave types are invalid.');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.leaveYearConfiguration.update({
          where: { id },
          data: {
            name: input.name?.trim(),
            calendarYear,
            yearStartDate: input.yearStartDate ? yearStart : undefined,
            yearEndDate: input.yearEndDate ? yearEnd : undefined,
            updatedByAdminId: adminId,
          },
        });

        if (input.allocations) {
          await this.syncLeaveBalanceAllocationsInTransaction({
            tx,
            organizationId,
            configurationId: id,
            adminId,
            existing,
            allocations: input.allocations,
            yearStart,
            yearEnd,
            calendarYear,
          });
        } else if (input.yearStartDate || input.yearEndDate) {
          await tx.leaveYearAllocation.updateMany({
            where: { leaveYearConfigurationId: id, organizationId },
            data: {
              effectiveFrom: yearStart,
              effectiveTo: yearEnd,
              updatedByAdminId: adminId,
            },
          });
        }

        const full = await tx.leaveYearConfiguration.findFirst({
          where: { id },
          include: this.yearConfigurationInclude(),
        });
        if (!full) throw new LeaveNotFoundError('Leave year configuration');
        return toLeaveYearConfigurationItem(full);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError(
          'A leave balance configuration already exists for this calendar year.',
        );
      }
      throw error;
    }
  }

  async deleteYearConfiguration(organizationId: string, id: string) {
    const existing = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new LeaveNotFoundError('Leave year configuration');

    const snapshot = await this.snapshotLeaveBalanceDependencies(organizationId, id);
    LeaveBalanceDeletionPolicy.assertCanDelete(snapshot);

    await this.prisma.$transaction(async (tx) => {
      const balances = await tx.employeeLeaveBalance.findMany({
        where: { organizationId, leaveYearConfigurationId: id },
        select: { id: true },
      });
      const balanceIds = balances.map((row) => row.id);
      if (balanceIds.length > 0) {
        await tx.leaveBalanceTransaction.deleteMany({
          where: { employeeLeaveBalanceId: { in: balanceIds } },
        });
        await tx.employeeLeaveBalance.deleteMany({
          where: { id: { in: balanceIds } },
        });
      }
      await tx.leaveYearConfiguration.delete({ where: { id } });
    });
  }

  async setYearConfigurationStatus(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveYearConfigurationStatusRequest,
  ) {
    const existing = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new LeaveNotFoundError('Leave year configuration');

    await this.prisma.leaveYearConfiguration.update({
      where: { id },
      data: {
        status: input.status,
        activatedAt: input.status === 'ACTIVE' ? new Date() : existing.activatedAt,
        updatedByAdminId: adminId,
      },
    });
    if (input.status === 'ACTIVE') {
      await this.generateEmployeeBalances(organizationId, id, adminId);
    }
    return this.getYearConfiguration(organizationId, id);
  }

  async activateYearConfiguration(organizationId: string, id: string, adminId: string) {
    return this.setYearConfigurationStatus(organizationId, id, adminId, { status: 'ACTIVE' });
  }

  async closeYearConfiguration(organizationId: string, id: string, adminId: string) {
    return this.setYearConfigurationStatus(organizationId, id, adminId, { status: 'INACTIVE' });
  }

  async generateEmployeeBalances(organizationId: string, yearConfigurationId: string, adminId: string) {
    const config = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id: yearConfigurationId, organizationId },
    });
    if (!config) throw new LeaveNotFoundError('Leave year configuration');
    if (config.status !== 'ACTIVE') {
      throw new LeaveValidationError('Employee balances can only be generated for active policies.');
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
        deactivatedAt: null,
      },
      select: { id: true },
    });

    let created = 0;
    let skipped = 0;
    for (const employee of employees) {
      const result = await this.ensureEmployeeLeaveBalancesForEmployee(
        organizationId,
        yearConfigurationId,
        employee.id,
        adminId,
      );
      created += result.created;
      skipped += result.skipped;
    }

    await this.prisma.leaveYearConfiguration.update({
      where: { id: yearConfigurationId },
      data: { balancesGeneratedAt: new Date(), updatedByAdminId: adminId },
    });

    return { created, skipped };
  }

  async listAllocations(organizationId: string, query: LeaveAllocationListQuery) {
    let configurationId = query.leaveYearConfigurationId;
    if (!configurationId && query.calendarYear) {
      const config = await this.getYearConfigurationByYear(organizationId, query.calendarYear);
      if (!config) throw new LeaveNotFoundError('Leave year configuration');
      configurationId = config.id;
    }
    if (!configurationId) {
      throw new LeaveValidationError('Provide leaveYearConfigurationId or calendarYear.');
    }
    const yearConfiguration = await this.getYearConfiguration(organizationId, configurationId);
    const where: Prisma.LeaveYearAllocationWhereInput = {
      organizationId,
      leaveYearConfigurationId: configurationId,
    };
    if (query.activeOnly) where.isActive = true;
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.leaveYearAllocation.findMany({
        where,
        include: { leaveType: true, leaveYearConfiguration: true },
        orderBy: { leaveType: { name: 'asc' } },
        skip,
        take: query.pageSize,
      }),
      this.prisma.leaveYearAllocation.count({ where }),
    ]);
    return {
      yearConfiguration,
      items: rows.map(toLeaveYearAllocationItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async createAllocation(
    organizationId: string,
    adminId: string,
    input: CreateLeaveYearAllocationRequest,
  ) {
    await this.getYearConfiguration(organizationId, input.leaveYearConfigurationId);
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!leaveType) throw new LeaveNotFoundError('Leave type');
    try {
      const row = await this.prisma.leaveYearAllocation.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveYearConfigurationId: input.leaveYearConfigurationId,
          leaveTypeId: input.leaveTypeId,
          annualAllocationDays: parseLeaveDays(input.annualAllocationDays),
          accrualMethod: input.accrualMethod,
          carryForwardEnabled: input.carryForwardEnabled,
          maxCarryForwardDays: parseLeaveDays(input.maxCarryForwardDays),
          eligibility: input.eligibility,
          eligibleEmployeeIds: input.eligibleEmployeeIds,
          eligibleDepartments: input.eligibleDepartments,
          eligibleEmploymentTypes: input.eligibleEmploymentTypes,
          effectiveFrom: parseDateOnly(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? parseDateOnly(input.effectiveTo) : null,
          isActive: input.isActive,
          createdByAdminId: adminId,
          updatedByAdminId: adminId,
        },
        include: { leaveType: true, leaveYearConfiguration: true },
      });
      return toLeaveYearAllocationItem(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError('An allocation for this leave type already exists for the year.');
      }
      throw error;
    }
  }

  async updateAllocation(
    organizationId: string,
    allocationId: string,
    adminId: string,
    input: UpdateLeaveYearAllocationRequest,
  ) {
    const existing = await this.prisma.leaveYearAllocation.findFirst({
      where: { id: allocationId, organizationId },
    });
    if (!existing) throw new LeaveNotFoundError('Leave allocation');
    const row = await this.prisma.leaveYearAllocation.update({
      where: { id: allocationId },
      data: {
        annualAllocationDays: input.annualAllocationDays
          ? parseLeaveDays(input.annualAllocationDays)
          : undefined,
        accrualMethod: input.accrualMethod,
        carryForwardEnabled: input.carryForwardEnabled,
        maxCarryForwardDays: input.maxCarryForwardDays
          ? parseLeaveDays(input.maxCarryForwardDays)
          : undefined,
        eligibility: input.eligibility,
        eligibleEmployeeIds: input.eligibleEmployeeIds,
        eligibleDepartments: input.eligibleDepartments,
        eligibleEmploymentTypes: input.eligibleEmploymentTypes,
        effectiveFrom: input.effectiveFrom ? parseDateOnly(input.effectiveFrom) : undefined,
        effectiveTo:
          input.effectiveTo === undefined
            ? undefined
            : input.effectiveTo === null
              ? null
              : parseDateOnly(input.effectiveTo),
        isActive: input.isActive,
        updatedByAdminId: adminId,
      },
      include: { leaveType: true, leaveYearConfiguration: true },
    });
    return toLeaveYearAllocationItem(row);
  }

  async listEmployeeBalances(organizationId: string, query: EmployeeLeaveBalanceListQuery) {
    const where: Prisma.EmployeeLeaveBalanceWhereInput = { organizationId };
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
    if (query.calendarYear) {
      where.leaveYearConfiguration = { calendarYear: query.calendarYear };
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { employee: { displayName: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: q, mode: 'insensitive' } } },
        { leaveType: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.employeeLeaveBalance.findMany({
        where,
        include: {
          leaveType: true,
          leaveYearConfiguration: true,
          employee: { select: { displayName: true, employeeCode: true } },
        },
        orderBy: [{ leaveYearConfiguration: { calendarYear: 'desc' } }, { leaveType: { name: 'asc' } }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.employeeLeaveBalance.count({ where }),
    ]);
    return {
      items: rows.map(toEmployeeLeaveBalanceItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listEmployeeLeaveRecords(
    organizationId: string,
    leaveYearConfigurationId: string,
    query: EmployeeLeaveRecordsListQuery,
  ): Promise<EmployeeLeaveRecordsResponse> {
    const configuration = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id: leaveYearConfigurationId, organizationId },
      include: this.yearConfigurationInclude(),
    });
    if (!configuration) throw new LeaveNotFoundError('Leave year configuration');

    const employeeWhere: Prisma.EmployeeWhereInput = {
      organizationId,
      employeeLeaveBalances: { some: { leaveYearConfigurationId } },
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      employeeWhere.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, employees] = await this.prisma.$transaction([
      this.prisma.employee.count({ where: employeeWhere }),
      this.prisma.employee.findMany({
        where: employeeWhere,
        orderBy: { displayName: 'asc' },
        skip,
        take: query.pageSize,
        include: {
          employeeLeaveBalances: {
            where: { organizationId, leaveYearConfigurationId },
            include: { leaveType: true },
          },
        },
      }),
    ]);

    return buildEmployeeLeaveRecordsResponse({
      configuration,
      employees,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async listMyEmployeeLeaveBalances(
    organizationId: string,
    employeeId: string,
    performedByAdminId: string,
    query: EmployeeLeaveBalanceListQuery,
  ): Promise<EmployeeLeaveBalanceListResponse> {
    const asOfKey = this.resolveBalanceAsOfDateKey(query.calendarYear);
    const asOfDate = parseDateOnly(asOfKey);
    const policy = await this.findActivePolicyForDate(organizationId, asOfDate);

    if (!policy) {
      const availability = await this.describeMissingPolicyAvailability(organizationId, asOfKey);
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        availability,
      };
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: {
        id: true,
        department: true,
        employmentType: true,
        employmentStatus: true,
        deactivatedAt: true,
      },
    });
    if (
      !employee ||
      employee.deactivatedAt ||
      !['ACTIVE', 'ON_LEAVE'].includes(employee.employmentStatus)
    ) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        availability: {
          reason: 'EMPLOYEE_NOT_ACTIVE',
          message: 'Leave balances are only available for active employee accounts.',
        },
      };
    }

    const eligibleAllocationCount = await this.countEligibleAllocationsForEmployee(
      organizationId,
      policy.id,
      employee,
      asOfDate,
    );
    if (eligibleAllocationCount === 0) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        availability: {
          reason: 'NO_ELIGIBLE_ALLOCATIONS',
          message: `No leave entitlements in "${policy.name}" apply to your employee profile.`,
          policyName: policy.name,
        },
      };
    }

    if (policy.balancesGeneratedAt === null) {
      await this.generateEmployeeBalances(organizationId, policy.id, performedByAdminId);
    } else {
      await this.ensureEmployeeLeaveBalancesForEmployee(
        organizationId,
        policy.id,
        employeeId,
        performedByAdminId,
      );
    }

    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.EmployeeLeaveBalanceWhereInput = {
      organizationId,
      employeeId,
      leaveYearConfigurationId: policy.id,
    };
    const [rows, total] = await Promise.all([
      this.prisma.employeeLeaveBalance.findMany({
        where,
        include: {
          leaveType: true,
          leaveYearConfiguration: true,
          employee: { select: { displayName: true, employeeCode: true } },
        },
        orderBy: { leaveType: { name: 'asc' } },
        skip,
        take: query.pageSize,
      }),
      this.prisma.employeeLeaveBalance.count({ where }),
    ]);

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        availability: {
          reason: 'BALANCES_NOT_INITIALIZED',
          message:
            'Leave entitlements could not be initialized from the active policy. Contact HR to review your employee profile and policy allocations.',
          policyName: policy.name,
        },
      };
    }

    return {
      items: rows.map(toEmployeeLeaveBalanceItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      availability: {
        reason: 'READY',
        message: 'Leave balances are available for the active policy.',
        policyName: policy.name,
      },
    };
  }

  async getEmployeeBalance(organizationId: string, balanceId: string) {
    const row = await this.prisma.employeeLeaveBalance.findFirst({
      where: { id: balanceId, organizationId },
      include: {
        leaveType: true,
        leaveYearConfiguration: true,
        employee: { select: { displayName: true, employeeCode: true } },
      },
    });
    if (!row) throw new LeaveNotFoundError('Employee leave balance');
    return toEmployeeLeaveBalanceItem(row);
  }

  async adjustEmployeeBalance(
    organizationId: string,
    balanceId: string,
    adminId: string,
    input: AdjustEmployeeLeaveBalanceRequest,
  ) {
    const days = parseLeaveDays(input.days);
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.employeeLeaveBalance.findFirst({
        where: { id: balanceId, organizationId },
        include: { leaveType: true, leaveYearConfiguration: true },
      });
      if (!balance) throw new LeaveNotFoundError('Employee leave balance');

      const before = computeAvailableDays(balance);
      const beforeDecimal = parseLeaveDays(before);
      const afterDecimal =
        input.direction === 'CREDIT' ? beforeDecimal.add(days) : beforeDecimal.sub(days);
      if (afterDecimal.lessThan(0)) {
        throw new LeaveValidationError('Adjustment would make the available balance negative.');
      }

      const updated = await tx.employeeLeaveBalance.update({
        where: { id: balanceId },
        data:
          input.direction === 'CREDIT'
            ? { adjustmentCreditDays: balance.adjustmentCreditDays.add(days) }
            : { adjustmentDebitDays: balance.adjustmentDebitDays.add(days) },
        include: { leaveType: true, leaveYearConfiguration: true },
      });

      await tx.leaveBalanceTransaction.create({
        data: {
          id: randomUUID(),
          organizationId,
          employeeId: balance.employeeId,
          leaveTypeId: balance.leaveTypeId,
          employeeLeaveBalanceId: balance.id,
          calendarYear: balance.leaveYearConfiguration.calendarYear,
          transactionType: input.direction === 'CREDIT' ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT',
          days,
          balanceBeforeDays: beforeDecimal,
          balanceAfterDays: afterDecimal,
          reason: input.reason,
          performedByAdminId: adminId,
        },
      });

      return toEmployeeLeaveBalanceItem(updated);
    });
  }

  async listBalanceTransactions(organizationId: string, query: LeaveBalanceTransactionListQuery) {
    const where: Prisma.LeaveBalanceTransactionWhereInput = { organizationId };
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.calendarYear) where.calendarYear = query.calendarYear;
    if (query.employeeLeaveBalanceId) where.employeeLeaveBalanceId = query.employeeLeaveBalanceId;
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.leaveBalanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.leaveBalanceTransaction.count({ where }),
    ]);
    return {
      items: rows.map(toLeaveBalanceTransactionItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private leaveRequestInclude() {
    return {
      leaveType: true,
      leaveYearConfiguration: true,
      employee: { select: { displayName: true, employeeCode: true } },
      selectedDates: { orderBy: { sortOrder: 'asc' as const } },
    } as const;
  }

  async listLeaveRequests(
    organizationId: string,
    query: LeaveRequestListQuery,
    scope: { employeeId?: string },
  ) {
    const where: Prisma.LeaveRequestWhereInput = { organizationId };
    if (scope.employeeId) where.employeeId = scope.employeeId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
    if (query.calendarYear) {
      const configIds = await this.yearConfigurationIdsForYear(organizationId, query.calendarYear);
      if (configIds.length === 0) {
        return {
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        };
      }
      where.leaveYearConfigurationId = { in: configIds };
    }
    if (query.from || query.to) {
      where.AND = [
        query.from ? { endDate: { gte: parseDateOnly(query.from) } } : {},
        query.to ? { startDate: { lte: parseDateOnly(query.to) } } : {},
      ];
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { reason: { contains: q, mode: 'insensitive' } },
        { employee: { displayName: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: this.leaveRequestInclude(),
        orderBy: { appliedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return {
      items: rows.map(toLeaveRequestItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getLeaveRequest(
    organizationId: string,
    requestId: string,
    scope: { employeeId?: string },
  ) {
    const row = await this.prisma.leaveRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
        ...(scope.employeeId ? { employeeId: scope.employeeId } : {}),
      },
      include: this.leaveRequestInclude(),
    });
    if (!row) throw new LeaveNotFoundError('Leave request');
    return toLeaveRequestItem(row);
  }

  async applyForLeave(
    organizationId: string,
    employeeId: string,
    adminId: string,
    input: ApplyLeaveRequest,
    computedTotalDays: string,
  ) {
    const resolved = resolveLeaveRequestDates({
      selectedDates: input.selectedDates,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
      halfDayDate: input.halfDayDate ?? null,
    });
    const totalDays = parseLeaveDays(computedTotalDays);
    if (input.idempotencyKey) {
      const existing = await this.prisma.leaveRequest.findFirst({
        where: { organizationId, idempotencyKey: input.idempotencyKey },
        include: this.leaveRequestInclude(),
      });
      if (existing) return toLeaveRequestItem(existing);
    }

    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: input.leaveTypeId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!leaveType) throw new LeaveNotFoundError('Leave type');

    const overlappingDate = await this.prisma.leaveRequestDate.findFirst({
      where: {
        organizationId,
        leaveDate: { in: resolved.selectedDates.map((d) => parseDateOnly(d)) },
        leaveRequest: {
          employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      },
      select: { leaveRequestId: true },
    });
    if (overlappingDate) {
      throw new LeaveConflictError('Leave request overlaps an existing pending or approved request.');
    }

    const start = parseDateOnly(resolved.startDate);
    const end = parseDateOnly(resolved.endDate);
    const yearConfig = await this.findActivePolicyForDate(organizationId, start);
    if (!yearConfig) {
      throw new LeaveValidationError('No active leave policy applies to the selected dates.');
    }
    if (start < yearConfig.yearStartDate || end > yearConfig.yearEndDate) {
      throw new LeaveValidationError('Leave dates must fall within the active leave policy period.');
    }

    const allocation = await this.prisma.leaveYearAllocation.findFirst({
      where: {
        organizationId,
        leaveYearConfigurationId: yearConfig.id,
        leaveTypeId: input.leaveTypeId,
        isActive: true,
      },
    });
    if (!allocation) {
      throw new LeaveValidationError('This leave type is not included in the active leave policy.');
    }
    for (const dateKey of resolved.selectedDates) {
      const date = parseDateOnly(dateKey);
      if (!this.isAllocationEffectiveOnDate(allocation, date)) {
        throw new LeaveValidationError(
          `This leave type is not effective for the selected date ${dateKey}.`,
        );
      }
    }

    await this.ensureEmployeeLeaveBalancesForEmployee(
      organizationId,
      yearConfig.id,
      employeeId,
      adminId,
    );

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.employeeLeaveBalance.findFirst({
        where: {
          organizationId,
          employeeId,
          leaveTypeId: input.leaveTypeId,
          leaveYearConfigurationId: yearConfig.id,
        },
        include: { leaveType: true, leaveYearConfiguration: true },
      });
      if (!balance) {
        throw new LeaveValidationError('No leave balance is available for this leave type and year.');
      }

      const available = parseLeaveDays(computeAvailableDays(balance));
      if (available.lessThan(totalDays)) {
        throw new LeaveValidationError('Insufficient leave balance for this request.');
      }

      const request = await tx.leaveRequest.create({
        data: {
          id: randomUUID(),
          organizationId,
          employeeId,
          leaveTypeId: input.leaveTypeId,
          leaveYearConfigurationId: yearConfig.id,
          startDate: parseDateOnly(resolved.startDate),
          endDate: parseDateOnly(resolved.endDate),
          halfDayDate:
            input.isHalfDay && resolved.halfDayDate
              ? parseDateOnly(resolved.halfDayDate)
              : null,
          isHalfDay: input.isHalfDay,
          halfDaySession: input.isHalfDay ? input.halfDaySession ?? null : null,
          totalDays,
          reason: input.reason,
          notes: input.notes,
          attachmentStoredObjectId: input.attachmentStoredObjectId ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
        },
        include: this.leaveRequestInclude(),
      });

      await tx.leaveRequestDate.createMany({
        data: resolved.selectedDates.map((dateKey, index) => ({
          id: randomUUID(),
          organizationId,
          leaveRequestId: request.id,
          leaveDate: parseDateOnly(dateKey),
          sortOrder: index,
        })),
      });

      const requestWithDates = await tx.leaveRequest.findFirstOrThrow({
        where: { id: request.id },
        include: this.leaveRequestInclude(),
      });

      await tx.leaveRequestStatusEvent.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveRequestId: request.id,
          fromStatus: null,
          toStatus: 'PENDING',
          reason: input.reason,
          performedByAdminId: adminId,
        },
      });

      return toLeaveRequestItem(requestWithDates);
    });
  }

  async cancelLeaveRequest(
    organizationId: string,
    requestId: string,
    adminId: string,
    reason: string,
    scope: { employeeId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: {
          id: requestId,
          organizationId,
          ...(scope.employeeId ? { employeeId: scope.employeeId } : {}),
        },
        include: this.leaveRequestInclude(),
      });
      if (!request) throw new LeaveNotFoundError('Leave request');
      if (request.status !== 'PENDING') {
        throw new LeaveValidationError('Only pending leave requests can be cancelled.');
      }

      const balance = await tx.employeeLeaveBalance.findFirst({
        where: {
          organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          leaveYearConfigurationId: request.leaveYearConfigurationId,
        },
      });
      if (!balance) throw new LeaveNotFoundError('Employee leave balance');

      const legacyReserved = balance.reservedPendingDays.gte(request.totalDays);
      let beforeAvailable = parseLeaveDays(computeAvailableDays(balance));
      let afterAvailable = beforeAvailable;

      if (legacyReserved) {
        await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: { reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays) },
        });
        afterAvailable = beforeAvailable.add(request.totalDays);
      }

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: this.leaveRequestInclude(),
      });

      const yearRow = await tx.leaveYearConfiguration.findUnique({
        where: { id: request.leaveYearConfigurationId },
        select: { calendarYear: true },
      });

      if (legacyReserved) {
        await tx.leaveBalanceTransaction.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            employeeLeaveBalanceId: balance.id,
            calendarYear: yearRow?.calendarYear ?? request.startDate.getUTCFullYear(),
            transactionType: 'LEAVE_CANCELLED_REVERSAL',
            days: request.totalDays,
            balanceBeforeDays: beforeAvailable,
            balanceAfterDays: afterAvailable,
            leaveRequestId: request.id,
            reason,
            performedByAdminId: adminId,
          },
        });
      }

      await tx.leaveRequestStatusEvent.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveRequestId: request.id,
          fromStatus: 'PENDING',
          toStatus: 'CANCELLED',
          reason,
          performedByAdminId: adminId,
        },
      });

      return toLeaveRequestItem(updated);
    });
  }

  async approveLeaveRequest(organizationId: string, requestId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id: requestId, organizationId },
        include: this.leaveRequestInclude(),
      });
      if (!request) throw new LeaveNotFoundError('Leave request');
      if (request.status !== 'PENDING') {
        throw new LeaveValidationError('Only pending leave requests can be approved.');
      }

      const balance = await tx.employeeLeaveBalance.findFirst({
        where: {
          organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          leaveYearConfigurationId: request.leaveYearConfigurationId,
        },
      });
      if (!balance) throw new LeaveNotFoundError('Employee leave balance');

      const availableBefore = parseLeaveDays(computeAvailableDays(balance));
      if (availableBefore.lessThan(request.totalDays)) {
        throw new LeaveValidationError('Insufficient leave balance for this request.');
      }

      const legacyReserved = balance.reservedPendingDays.gte(request.totalDays);
      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: {
          ...(legacyReserved
            ? { reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays) }
            : {}),
          usedApprovedDays: balance.usedApprovedDays.add(request.totalDays),
        },
      });

      const updatedBalance = await tx.employeeLeaveBalance.findUniqueOrThrow({
        where: { id: balance.id },
      });
      const availableAfter = parseLeaveDays(computeAvailableDays(updatedBalance));

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedByAdminId: adminId,
        },
        include: this.leaveRequestInclude(),
      });

      const yearRow = await tx.leaveYearConfiguration.findUnique({
        where: { id: request.leaveYearConfigurationId },
        select: { calendarYear: true },
      });

      await tx.leaveBalanceTransaction.create({
        data: {
          id: randomUUID(),
          organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          employeeLeaveBalanceId: balance.id,
          calendarYear: yearRow?.calendarYear ?? request.startDate.getUTCFullYear(),
          transactionType: 'LEAVE_APPROVED',
          days: request.totalDays,
          balanceBeforeDays: availableBefore,
          balanceAfterDays: availableAfter,
          leaveRequestId: request.id,
          reason: 'Leave request approved',
          performedByAdminId: adminId,
        },
      });

      await tx.leaveRequestStatusEvent.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveRequestId: request.id,
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          reason: 'Approved',
          performedByAdminId: adminId,
        },
      });

      return toLeaveRequestItem(updated);
    });
  }

  async rejectLeaveRequest(
    organizationId: string,
    requestId: string,
    adminId: string,
    rejectionReason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id: requestId, organizationId },
        include: this.leaveRequestInclude(),
      });
      if (!request) throw new LeaveNotFoundError('Leave request');
      if (request.status !== 'PENDING') {
        throw new LeaveValidationError('Only pending leave requests can be rejected.');
      }

      const balance = await tx.employeeLeaveBalance.findFirst({
        where: {
          organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          leaveYearConfigurationId: request.leaveYearConfigurationId,
        },
      });
      if (!balance) throw new LeaveNotFoundError('Employee leave balance');

      const legacyReserved = balance.reservedPendingDays.gte(request.totalDays);
      const availableBefore = parseLeaveDays(computeAvailableDays(balance));
      let availableAfter = availableBefore;

      if (legacyReserved) {
        await tx.employeeLeaveBalance.update({
          where: { id: balance.id },
          data: { reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays) },
        });
        const updatedBalance = await tx.employeeLeaveBalance.findUniqueOrThrow({
          where: { id: balance.id },
        });
        availableAfter = parseLeaveDays(computeAvailableDays(updatedBalance));
      }

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedByAdminId: adminId,
          rejectionReason,
        },
        include: this.leaveRequestInclude(),
      });

      const yearRow = await tx.leaveYearConfiguration.findUnique({
        where: { id: request.leaveYearConfigurationId },
        select: { calendarYear: true },
      });

      if (legacyReserved) {
        await tx.leaveBalanceTransaction.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            employeeLeaveBalanceId: balance.id,
            calendarYear: yearRow?.calendarYear ?? request.startDate.getUTCFullYear(),
            transactionType: 'LEAVE_REJECTED_RELEASE',
            days: request.totalDays,
            balanceBeforeDays: availableBefore,
            balanceAfterDays: availableAfter,
            leaveRequestId: request.id,
            reason: rejectionReason,
            performedByAdminId: adminId,
          },
        });
      }

      await tx.leaveRequestStatusEvent.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveRequestId: request.id,
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          reason: rejectionReason,
          performedByAdminId: adminId,
        },
      });

      return toLeaveRequestItem(updated);
    });
  }

  private resolveBalanceAsOfDateKey(calendarYear?: number): string {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (!calendarYear) return todayKey;
    const currentYear = new Date().getUTCFullYear();
    if (calendarYear === currentYear) return todayKey;
    if (calendarYear < currentYear) return `${calendarYear}-12-31`;
    return `${calendarYear}-01-01`;
  }

  async getActiveLeavePolicyWindow(
    organizationId: string,
    asOfDateKey: string,
  ): Promise<{ yearStartDate: string; yearEndDate: string } | null> {
    const policy = await this.findActivePolicyForDate(organizationId, parseDateOnly(asOfDateKey));
    if (!policy) return null;
    return {
      yearStartDate: policy.yearStartDate.toISOString().slice(0, 10),
      yearEndDate: policy.yearEndDate.toISOString().slice(0, 10),
    };
  }

  private async findActivePolicyForDate(organizationId: string, date: Date) {
    return this.prisma.leaveYearConfiguration.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        yearStartDate: { lte: date },
        yearEndDate: { gte: date },
      },
      orderBy: { yearStartDate: 'desc' },
    });
  }

  private async describeMissingPolicyAvailability(
    organizationId: string,
    asOfKey: string,
  ): Promise<EmployeeLeaveBalanceAvailability> {
    const asOfDate = parseDateOnly(asOfKey);
    const activePolicies = await this.prisma.leaveYearConfiguration.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { yearStartDate: 'asc' },
      select: { name: true, yearStartDate: true, yearEndDate: true },
    });
    if (activePolicies.length === 0) {
      return {
        reason: 'NO_ACTIVE_POLICY',
        message: 'No active leave policy has been configured yet. Contact HR.',
      };
    }
    const inFuture = activePolicies.every((row) => row.yearStartDate > asOfDate);
    const inPast = activePolicies.every((row) => row.yearEndDate < asOfDate);
    if (inFuture) {
      const next = activePolicies[0]!;
      return {
        reason: 'POLICY_NOT_IN_EFFECT',
        message: `The active leave policy "${next.name}" starts on ${next.yearStartDate.toISOString().slice(0, 10)}.`,
        policyName: next.name,
      };
    }
    if (inPast) {
      const last = activePolicies[activePolicies.length - 1]!;
      return {
        reason: 'POLICY_NOT_IN_EFFECT',
        message: `The leave policy "${last.name}" ended on ${last.yearEndDate.toISOString().slice(0, 10)}.`,
        policyName: last.name,
      };
    }
    return {
      reason: 'POLICY_NOT_IN_EFFECT',
      message: 'No leave policy is in effect for the current date. Contact HR.',
    };
  }

  private async countEligibleAllocationsForEmployee(
    organizationId: string,
    policyId: string,
    employee: EmployeeRow,
    asOfDate: Date,
  ): Promise<number> {
    const allocations = await this.prisma.leaveYearAllocation.findMany({
      where: { organizationId, leaveYearConfigurationId: policyId, isActive: true },
      include: { leaveType: true },
    });
    return allocations.filter(
      (allocation) =>
        this.isAllocationEffectiveOnDate(allocation, asOfDate) &&
        this.isAllocationEligible(allocation, employee),
    ).length;
  }

  private isAllocationEffectiveOnDate(
    allocation: { effectiveFrom: Date; effectiveTo: Date | null },
    asOfDate: Date,
  ): boolean {
    if (allocation.effectiveFrom > asOfDate) return false;
    if (allocation.effectiveTo && allocation.effectiveTo < asOfDate) return false;
    return true;
  }

  private async ensureEmployeeLeaveBalancesForEmployee(
    organizationId: string,
    yearConfigurationId: string,
    employeeId: string,
    adminId: string,
  ): Promise<{ created: number; skipped: number }> {
    const config = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id: yearConfigurationId, organizationId },
    });
    if (!config) throw new LeaveNotFoundError('Leave year configuration');

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, department: true, employmentType: true, employmentStatus: true, deactivatedAt: true },
    });
    if (
      !employee ||
      employee.deactivatedAt ||
      !['ACTIVE', 'ON_LEAVE'].includes(employee.employmentStatus)
    ) {
      return { created: 0, skipped: 0 };
    }

    const allocations = await this.prisma.leaveYearAllocation.findMany({
      where: {
        organizationId,
        leaveYearConfigurationId: yearConfigurationId,
        isActive: true,
      },
      include: { leaveType: true },
    });

    let created = 0;
    let skipped = 0;

    for (const allocation of allocations) {
      if (!this.isAllocationEligible(allocation, employee)) continue;

      const existing = await this.prisma.employeeLeaveBalance.findFirst({
        where: {
          organizationId,
          employeeId: employee.id,
          leaveTypeId: allocation.leaveTypeId,
          leaveYearConfigurationId: yearConfigurationId,
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const allocatedDays = allocation.annualAllocationDays;
      await this.prisma.$transaction(async (tx) => {
        const balance = await tx.employeeLeaveBalance.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: employee.id,
            leaveTypeId: allocation.leaveTypeId,
            leaveYearConfigurationId: yearConfigurationId,
            allocatedDays,
          },
        });
        await tx.leaveBalanceTransaction.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: employee.id,
            leaveTypeId: allocation.leaveTypeId,
            employeeLeaveBalanceId: balance.id,
            calendarYear: config.calendarYear,
            transactionType: 'INITIAL_ALLOCATION',
            days: allocatedDays,
            balanceBeforeDays: new Decimal(0),
            balanceAfterDays: allocatedDays,
            reason: 'Initial allocation from leave policy.',
            performedByAdminId: adminId,
          },
        });
      });
      created += 1;
    }

    return { created, skipped };
  }

  private async snapshotLeaveBalanceDependencies(
    organizationId: string,
    configurationId: string,
  ): Promise<LeaveBalanceDependencySnapshot> {
    const [
      pendingRequestCount,
      approvedRequestCount,
      consumedBalanceCount,
      adjustedBalanceCount,
      protectedTransactionCount,
    ] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { organizationId, leaveYearConfigurationId: configurationId, status: 'PENDING' },
      }),
      this.prisma.leaveRequest.count({
        where: { organizationId, leaveYearConfigurationId: configurationId, status: 'APPROVED' },
      }),
      this.prisma.employeeLeaveBalance.count({
        where: {
          organizationId,
          leaveYearConfigurationId: configurationId,
          OR: [{ usedApprovedDays: { gt: 0 } }, { reservedPendingDays: { gt: 0 } }],
        },
      }),
      this.prisma.employeeLeaveBalance.count({
        where: {
          organizationId,
          leaveYearConfigurationId: configurationId,
          OR: [
            { adjustmentCreditDays: { gt: 0 } },
            { adjustmentDebitDays: { gt: 0 } },
            { carryForwardDays: { gt: 0 } },
          ],
        },
      }),
      this.prisma.leaveBalanceTransaction.count({
        where: {
          organizationId,
          transactionType: { in: ['MANUAL_CREDIT', 'MANUAL_DEBIT', 'CARRY_FORWARD', 'POLICY_ADJUSTMENT'] },
          employeeLeaveBalance: { leaveYearConfigurationId: configurationId },
        },
      }),
    ]);
    return {
      pendingRequestCount,
      approvedRequestCount,
      consumedBalanceCount,
      adjustedBalanceCount,
      protectedTransactionCount,
    };
  }

  private async assertConfigurationDatesAllowActiveRequests(
    organizationId: string,
    configurationId: string,
    yearStart: Date,
    yearEnd: Date,
  ): Promise<void> {
    const violating = await this.prisma.leaveRequest.findFirst({
      where: {
        organizationId,
        leaveYearConfigurationId: configurationId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [{ startDate: { lt: yearStart } }, { endDate: { gt: yearEnd } }],
      },
      select: { id: true },
    });
    if (violating) {
      throw new LeaveValidationError(
        'Effective dates cannot change because pending or approved leave requests fall outside the new range.',
      );
    }
  }

  private async syncLeaveBalanceAllocationsInTransaction(input: {
    tx: Prisma.TransactionClient;
    organizationId: string;
    configurationId: string;
    adminId: string;
    existing: {
      allocations: Array<{
        id: string;
        leaveTypeId: string;
        leaveType: { name: string };
      }>;
    };
    allocations: ReadonlyArray<{ leaveTypeId: string; annualAllocationDays: string }>;
    yearStart: Date;
    yearEnd: Date;
    calendarYear: number;
  }): Promise<void> {
    const {
      tx,
      organizationId,
      configurationId,
      adminId,
      existing,
      allocations,
      yearStart,
      yearEnd,
      calendarYear,
    } = input;

    const employeeBalances = await tx.employeeLeaveBalance.findMany({
      where: { organizationId, leaveYearConfigurationId: configurationId },
      include: { leaveType: { select: { name: true } } },
    });

    const usageRows = employeeBalances.map((row) => ({
      leaveTypeId: row.leaveTypeId,
      leaveTypeName: row.leaveType.name,
      allocatedDays: row.allocatedDays,
      usedApprovedDays: row.usedApprovedDays,
      reservedPendingDays: row.reservedPendingDays,
      adjustmentCreditDays: row.adjustmentCreditDays,
      adjustmentDebitDays: row.adjustmentDebitDays,
      carryForwardDays: row.carryForwardDays,
    }));

    const incomingIds = new Set(allocations.map((line) => line.leaveTypeId));
    for (const allocation of existing.allocations) {
      if (incomingIds.has(allocation.leaveTypeId)) continue;
      assertLeaveTypeRemovalAllowed(usageRows, allocation.leaveTypeId, allocation.leaveType.name);
      const balanceIds = employeeBalances
        .filter((row) => row.leaveTypeId === allocation.leaveTypeId)
        .map((row) => row.id);
      if (balanceIds.length > 0) {
        await tx.leaveBalanceTransaction.deleteMany({
          where: { employeeLeaveBalanceId: { in: balanceIds } },
        });
        await tx.employeeLeaveBalance.deleteMany({ where: { id: { in: balanceIds } } });
      }
      await tx.leaveYearAllocation.delete({ where: { id: allocation.id } });
    }

    const typeNameById = new Map(existing.allocations.map((row) => [row.leaveTypeId, row.leaveType.name]));

    for (const line of allocations) {
      const annualAllocationDays = parseLeaveDays(line.annualAllocationDays);
      const existingAllocation = existing.allocations.find((row) => row.leaveTypeId === line.leaveTypeId);
      const leaveTypeName =
        existingAllocation?.leaveType.name ??
        (
          await tx.leaveType.findFirst({
            where: { id: line.leaveTypeId, organizationId },
            select: { name: true },
          })
        )?.name ??
        'Leave type';
      typeNameById.set(line.leaveTypeId, leaveTypeName);

      const balancesForType = employeeBalances.filter((row) => row.leaveTypeId === line.leaveTypeId);
      for (const balance of balancesForType) {
        assertAllocationReductionAllowed(
          {
            leaveTypeId: balance.leaveTypeId,
            allocatedDays: balance.allocatedDays,
            usedApprovedDays: balance.usedApprovedDays,
            reservedPendingDays: balance.reservedPendingDays,
            adjustmentCreditDays: balance.adjustmentCreditDays,
            adjustmentDebitDays: balance.adjustmentDebitDays,
            carryForwardDays: balance.carryForwardDays,
          },
          annualAllocationDays,
          leaveTypeName,
        );
      }

      if (existingAllocation) {
        await tx.leaveYearAllocation.update({
          where: { id: existingAllocation.id },
          data: {
            annualAllocationDays,
            effectiveFrom: yearStart,
            effectiveTo: yearEnd,
            updatedByAdminId: adminId,
          },
        });
        if (balancesForType.length > 0) {
          await tx.employeeLeaveBalance.updateMany({
            where: {
              organizationId,
              leaveYearConfigurationId: configurationId,
              leaveTypeId: line.leaveTypeId,
            },
            data: { allocatedDays: annualAllocationDays },
          });
        }
        continue;
      }

      await tx.leaveYearAllocation.create({
        data: {
          id: randomUUID(),
          organizationId,
          leaveYearConfigurationId: configurationId,
          leaveTypeId: line.leaveTypeId,
          annualAllocationDays,
          accrualMethod: 'ANNUAL_FULL',
          carryForwardEnabled: false,
          maxCarryForwardDays: parseLeaveDays('0'),
          eligibility: 'ALL_EMPLOYEES',
          eligibleEmployeeIds: [],
          eligibleDepartments: [],
          eligibleEmploymentTypes: [],
          effectiveFrom: yearStart,
          effectiveTo: yearEnd,
          isActive: true,
          createdByAdminId: adminId,
          updatedByAdminId: adminId,
        },
      });

      const employees = await tx.employee.findMany({
        where: {
          organizationId,
          employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
          deactivatedAt: null,
        },
        select: { id: true },
      });
      for (const employee of employees) {
        const exists = await tx.employeeLeaveBalance.findFirst({
          where: {
            organizationId,
            employeeId: employee.id,
            leaveTypeId: line.leaveTypeId,
            leaveYearConfigurationId: configurationId,
          },
        });
        if (exists) continue;
        const balance = await tx.employeeLeaveBalance.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: employee.id,
            leaveTypeId: line.leaveTypeId,
            leaveYearConfigurationId: configurationId,
            allocatedDays: annualAllocationDays,
          },
        });
        await tx.leaveBalanceTransaction.create({
          data: {
            id: randomUUID(),
            organizationId,
            employeeId: employee.id,
            leaveTypeId: line.leaveTypeId,
            employeeLeaveBalanceId: balance.id,
            calendarYear,
            transactionType: 'INITIAL_ALLOCATION',
            days: annualAllocationDays,
            balanceBeforeDays: new Decimal(0),
            balanceAfterDays: annualAllocationDays,
            reason: 'Initial allocation from leave policy.',
            performedByAdminId: adminId,
          },
        });
      }
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  private isAllocationEligible(
    allocation: {
      eligibility: string;
      eligibleEmployeeIds: unknown;
      eligibleDepartments: unknown;
      eligibleEmploymentTypes: unknown;
    },
    employee: EmployeeRow,
  ): boolean {
    switch (allocation.eligibility) {
      case 'ALL_EMPLOYEES':
        return true;
      case 'SELECTED_EMPLOYEES':
        return this.readJsonStringArray(allocation.eligibleEmployeeIds).includes(employee.id);
      case 'SELECTED_DEPARTMENTS':
        return (
          !!employee.department &&
          this.readJsonStringArray(allocation.eligibleDepartments).includes(employee.department)
        );
      case 'SELECTED_EMPLOYMENT_TYPES':
        return this.readJsonStringArray(allocation.eligibleEmploymentTypes).includes(
          employee.employmentType,
        );
      default:
        return false;
    }
  }

  private readJsonStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  }

  private async yearConfigurationIdsForYear(
    organizationId: string,
    calendarYear: number,
  ): Promise<string[]> {
    const configs = await this.prisma.leaveYearConfiguration.findMany({
      where: { organizationId, calendarYear },
      select: { id: true },
    });
    return configs.map((c) => c.id);
  }
}
