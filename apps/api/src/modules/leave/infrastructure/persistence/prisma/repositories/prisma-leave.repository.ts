import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import type {
  CreateLeaveTypeRequest,
  CreateLeaveYearAllocationRequest,
  CreateLeaveBalanceConfigurationRequest,
  CreateLeaveYearConfigurationRequest,
  UpdateLeaveBalanceConfigurationRequest,
  EmployeeLeaveBalanceListQuery,
  LeaveAllocationListQuery,
  LeaveBalanceTransactionListQuery,
  LeaveRequestListQuery,
  LeaveTypeListQuery,
  UpdateLeaveTypeRequest,
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
} from '@techwin/contracts';
import type { LeaveRepository } from '../../../../domain/repositories/leave.repository.js';
import { resolveLeaveRequestDates } from '../../../../domain/policies/leave-request-dates.policy.js';
import {
  computeAvailableDays,
  parseDateOnly,
  parseLeaveDays,
  toEmployeeLeaveBalanceItem,
  toLeaveBalanceTransactionItem,
  toLeaveRequestItem,
  toLeaveTypeItem,
  toLeaveYearAllocationItem,
  toLeaveYearConfigurationItem,
} from '../mappers/leave.mapper.js';

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

  async listLeaveTypes(organizationId: string, query: LeaveTypeListQuery) {
    const where: Prisma.LeaveTypeWhereInput = { organizationId };
    if (query.status) {
      where.status = query.status;
    } else if (!query.includeInactive) {
      where.status = 'ACTIVE';
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.leaveType.findMany({
        where,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.leaveType.count({ where }),
    ]);
    return {
      items: rows.map(toLeaveTypeItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getLeaveType(organizationId: string, leaveTypeId: string) {
    const row = await this.prisma.leaveType.findFirst({
      where: { id: leaveTypeId, organizationId },
    });
    if (!row) throw new LeaveNotFoundError('Leave type');
    return toLeaveTypeItem(row);
  }

  async createLeaveType(organizationId: string, adminId: string, input: CreateLeaveTypeRequest) {
    try {
      const row = await this.prisma.leaveType.create({
        data: {
          id: randomUUID(),
          organizationId,
          name: input.name,
          code: input.code.toUpperCase(),
          description: input.description,
          isPaid: input.isPaid,
          annualAllocationEligible: input.annualAllocationEligible,
          carryForwardEnabled: input.carryForwardEnabled,
          maxCarryForwardDays: parseLeaveDays(input.maxCarryForwardDays),
          maxConsecutiveDays: input.maxConsecutiveDays ?? null,
          minApplicationDays: parseLeaveDays(input.minApplicationDays),
          halfDayAllowed: input.halfDayAllowed,
          attachmentRequired: input.attachmentRequired,
          attachmentRequiredAfterDays: input.attachmentRequiredAfterDays
            ? parseLeaveDays(input.attachmentRequiredAfterDays)
            : null,
          appliesToAllEmployees: input.appliesToAllEmployees,
          applicableEmployeeIds: input.applicableEmployeeIds,
          applicableDepartments: input.applicableDepartments,
          createdByAdminId: adminId,
          updatedByAdminId: adminId,
        },
      });
      return toLeaveTypeItem(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError('A leave type with this code already exists.');
      }
      throw error;
    }
  }

  async updateLeaveType(
    organizationId: string,
    leaveTypeId: string,
    adminId: string,
    input: UpdateLeaveTypeRequest,
  ) {
    await this.getLeaveType(organizationId, leaveTypeId);
    try {
      const row = await this.prisma.leaveType.update({
        where: { id: leaveTypeId },
        data: {
          name: input.name,
          code: input.code?.toUpperCase(),
          description: input.description,
          isPaid: input.isPaid,
          annualAllocationEligible: input.annualAllocationEligible,
          carryForwardEnabled: input.carryForwardEnabled,
          maxCarryForwardDays: input.maxCarryForwardDays
            ? parseLeaveDays(input.maxCarryForwardDays)
            : undefined,
          maxConsecutiveDays: input.maxConsecutiveDays,
          minApplicationDays: input.minApplicationDays
            ? parseLeaveDays(input.minApplicationDays)
            : undefined,
          halfDayAllowed: input.halfDayAllowed,
          attachmentRequired: input.attachmentRequired,
          attachmentRequiredAfterDays:
            input.attachmentRequiredAfterDays === undefined
              ? undefined
              : input.attachmentRequiredAfterDays === null
                ? null
                : parseLeaveDays(input.attachmentRequiredAfterDays),
          appliesToAllEmployees: input.appliesToAllEmployees,
          applicableEmployeeIds: input.applicableEmployeeIds,
          applicableDepartments: input.applicableDepartments,
          status: input.status,
          updatedByAdminId: adminId,
        },
      });
      return toLeaveTypeItem(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new LeaveConflictError('A leave type with this code already exists.');
      }
      throw error;
    }
  }

  async deleteLeaveType(organizationId: string, leaveTypeId: string) {
    await this.getLeaveType(organizationId, leaveTypeId);
    const [requests, balances] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { organizationId, leaveTypeId } }),
      this.prisma.employeeLeaveBalance.count({ where: { organizationId, leaveTypeId } }),
    ]);
    if (requests > 0 || balances > 0) {
      throw new LeaveConflictError(
        'This leave type is referenced by balances or leave requests. Deactivate it instead of deleting.',
      );
    }
    await this.prisma.leaveType.delete({ where: { id: leaveTypeId } });
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
    const existing = await this.getYearConfiguration(organizationId, id);
    if (existing.balancesGeneratedAt && (input.yearStartDate || input.yearEndDate)) {
      throw new LeaveValidationError(
        'Effective dates cannot be changed after employee balances were generated.',
      );
    }
    const row = await this.prisma.leaveYearConfiguration.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        yearStartDate: input.yearStartDate ? parseDateOnly(input.yearStartDate) : undefined,
        yearEndDate: input.yearEndDate ? parseDateOnly(input.yearEndDate) : undefined,
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
      include: { allocations: true },
    });
    if (!existing) throw new LeaveNotFoundError('Leave year configuration');
    const hasGenerated = existing.balancesGeneratedAt !== null;
    if (hasGenerated && (input.allocations || input.yearStartDate || input.yearEndDate)) {
      throw new LeaveValidationError(
        'Allocations and effective dates cannot be changed after employee balances were generated.',
      );
    }

    const yearStart = input.yearStartDate
      ? parseDateOnly(input.yearStartDate)
      : existing.yearStartDate;
    const yearEnd = input.yearEndDate ? parseDateOnly(input.yearEndDate) : existing.yearEndDate;

    if (input.allocations) {
      const leaveTypeIds = [...new Set(input.allocations.map((line) => line.leaveTypeId))];
      const activeTypes = await this.prisma.leaveType.findMany({
        where: { organizationId, id: { in: leaveTypeIds }, status: 'ACTIVE' },
        select: { id: true },
      });
      if (activeTypes.length !== leaveTypeIds.length) {
        throw new LeaveValidationError('One or more leave types are invalid or inactive.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.leaveYearConfiguration.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          yearStartDate: input.yearStartDate ? yearStart : undefined,
          yearEndDate: input.yearEndDate ? yearEnd : undefined,
          updatedByAdminId: adminId,
        },
      });

      if (input.allocations) {
        await tx.leaveYearAllocation.deleteMany({
          where: { leaveYearConfigurationId: id, organizationId },
        });
        for (const line of input.allocations) {
          await tx.leaveYearAllocation.create({
            data: {
              id: randomUUID(),
              organizationId,
              leaveYearConfigurationId: id,
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
  }

  async deleteYearConfiguration(organizationId: string, id: string) {
    const existing = await this.prisma.leaveYearConfiguration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new LeaveNotFoundError('Leave year configuration');

    const [balanceCount, requestCount] = await Promise.all([
      this.prisma.employeeLeaveBalance.count({
        where: { organizationId, leaveYearConfigurationId: id },
      }),
      this.prisma.leaveRequest.count({
        where: { organizationId, leaveYearConfigurationId: id },
      }),
    ]);
    if (balanceCount > 0 || requestCount > 0) {
      throw new LeaveConflictError(
        'This configuration cannot be deleted because employee balances or leave requests exist.',
      );
    }

    await this.prisma.leaveYearConfiguration.delete({ where: { id } });
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
    await this.getLeaveType(organizationId, input.leaveTypeId);
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
    });
    if (!leaveType) throw new LeaveNotFoundError('Leave type');

    if (input.isHalfDay && !leaveType.halfDayAllowed) {
      throw new LeaveValidationError('Half-day leave is not allowed for this leave type.');
    }
    const usingExplicitDates = (input.selectedDates?.length ?? 0) > 0;
    if (
      !usingExplicitDates &&
      leaveType.maxConsecutiveDays !== null &&
      leaveType.maxConsecutiveDays !== undefined &&
      !input.isHalfDay &&
      parseDateOnly(resolved.endDate).getTime() - parseDateOnly(resolved.startDate).getTime() >
        (leaveType.maxConsecutiveDays - 1) * 24 * 60 * 60 * 1000
    ) {
      throw new LeaveValidationError(
        `This leave type allows at most ${leaveType.maxConsecutiveDays} consecutive calendar days per request.`,
      );
    }
    if (leaveType.attachmentRequired && !input.attachmentStoredObjectId) {
      throw new LeaveValidationError('A supporting attachment is required for this leave type.');
    }

    if (
      leaveType.maxConsecutiveDays !== null &&
      leaveType.maxConsecutiveDays !== undefined &&
      totalDays.greaterThan(new Decimal(leaveType.maxConsecutiveDays))
    ) {
      throw new LeaveValidationError(
        `This leave type allows at most ${leaveType.maxConsecutiveDays} working days per request.`,
      );
    }

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

      const beforeAvailable = available;
      const afterAvailable = available.sub(totalDays);

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

      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: { reservedPendingDays: balance.reservedPendingDays.add(totalDays) },
      });

      await tx.leaveBalanceTransaction.create({
        data: {
          id: randomUUID(),
          organizationId,
          employeeId,
          leaveTypeId: input.leaveTypeId,
          employeeLeaveBalanceId: balance.id,
          calendarYear: yearConfig.calendarYear,
          transactionType: 'LEAVE_RESERVED',
          days: totalDays,
          balanceBeforeDays: beforeAvailable,
          balanceAfterDays: afterAvailable,
          leaveRequestId: request.id,
          reason: input.reason,
          performedByAdminId: adminId,
        },
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

      const beforeAvailable = parseLeaveDays(
        computeAvailableDays({
          ...balance,
          reservedPendingDays: balance.reservedPendingDays,
        }),
      );
      const afterAvailable = beforeAvailable.add(request.totalDays);

      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: { reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays) },
      });

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

      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: {
          reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays),
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

      const availableBefore = parseLeaveDays(computeAvailableDays(balance));

      await tx.employeeLeaveBalance.update({
        where: { id: balance.id },
        data: { reservedPendingDays: balance.reservedPendingDays.sub(request.totalDays) },
      });

      const updatedBalance = await tx.employeeLeaveBalance.findUniqueOrThrow({
        where: { id: balance.id },
      });
      const availableAfter = parseLeaveDays(computeAvailableDays(updatedBalance));

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
        this.isLeaveTypeApplicable(allocation.leaveType, employee) &&
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
      if (!this.isLeaveTypeApplicable(allocation.leaveType, employee)) continue;
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

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  private isLeaveTypeApplicable(
    leaveType: { appliesToAllEmployees: boolean; applicableEmployeeIds: unknown; applicableDepartments: unknown },
    employee: EmployeeRow,
  ): boolean {
    if (leaveType.appliesToAllEmployees) return true;
    const employeeIds = this.readJsonStringArray(leaveType.applicableEmployeeIds);
    if (employeeIds.includes(employee.id)) return true;
    const departments = this.readJsonStringArray(leaveType.applicableDepartments);
    if (employee.department && departments.includes(employee.department)) return true;
    return false;
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
