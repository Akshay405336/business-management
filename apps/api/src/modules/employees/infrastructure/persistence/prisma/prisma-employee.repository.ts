import { Injectable } from '@nestjs/common';
import { formatEmployeeCode } from '@techwin/validation';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import { EMPLOYEE_SEQUENCE_KEY } from '../../../domain/constants/employee-sequence.js';
import {
  EmployeeConflictError,
  EmployeeNotFoundError,
  EmployeeValidationError,
} from '../../../domain/errors/employee.errors.js';
import type {
  CreateEmployeeInput,
  EmployeeListFilters,
  EmployeeManagerSummary,
  EmployeeRecord,
  EmployeeRepository,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../../../domain/repositories/employee.repository.js';
import { rethrowEmployeeUniqueViolation } from './employee-unique-violation.js';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new EmployeeValidationError('Invalid date value.');
  }
  return parsed;
};

const managerSelect = {
  select: { id: true, displayName: true, employeeCode: true },
} as const;

type EmployeeRow = Prisma.EmployeeGetPayload<{ include: { reportingManager: typeof managerSelect } }>;

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: EmployeeRow): EmployeeRecord {
    return {
      id: row.id,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      workEmail: row.workEmail,
      phone: row.phone,
      alternatePhone: row.alternatePhone,
      profileImageUrl: row.profileImageUrl,
      jobTitle: row.jobTitle,
      department: row.department,
      employmentType: row.employmentType,
      employmentStatus: row.employmentStatus,
      dateOfJoining: dateOnly(row.dateOfJoining),
      probationEndDate: row.probationEndDate ? dateOnly(row.probationEndDate) : null,
      employmentEndDate: row.employmentEndDate ? dateOnly(row.employmentEndDate) : null,
      workLocation: row.workLocation,
      reportingManager: row.reportingManager
        ? {
            id: row.reportingManager.id,
            displayName: row.reportingManager.displayName,
            employeeCode: row.reportingManager.employeeCode,
          }
        : null,
      notes: row.notes,
      platformAdminId: row.platformAdminId,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async nextSequence(
    tx: Pick<PrismaService, 'organizationSequence'>,
    organizationId: string,
  ): Promise<number> {
    const row = await tx.organizationSequence.upsert({
      where: { organizationId_key: { organizationId, key: EMPLOYEE_SEQUENCE_KEY } },
      create: { organizationId, key: EMPLOYEE_SEQUENCE_KEY, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });
    return row.lastValue;
  }

  async previewEmployeeCode(organizationId: string): Promise<string> {
    const row = await this.prisma.organizationSequence.findUnique({
      where: { organizationId_key: { organizationId, key: EMPLOYEE_SEQUENCE_KEY } },
      select: { lastValue: true },
    });
    return formatEmployeeCode((row?.lastValue ?? 0) + 1);
  }

  async findEmployeeIdByWorkEmail(
    organizationId: string,
    workEmail: string,
    excludeEmployeeId?: string,
  ): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        workEmail,
        ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findEmployeeIdByPhone(
    organizationId: string,
    phone: string,
    excludeEmployeeId?: string,
  ): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        phone,
        ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async getReportingManagerId(organizationId: string, employeeId: string): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { reportingManagerId: true },
    });
    return row?.reportingManagerId ?? null;
  }

  async countDirectReports(organizationId: string, employeeId: string): Promise<number> {
    return this.prisma.employee.count({
      where: { organizationId, reportingManagerId: employeeId },
    });
  }

  async listManagerOptions(
    organizationId: string,
    excludeEmployeeId?: string,
  ): Promise<readonly EmployeeManagerSummary[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
        ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
      },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, employeeCode: true },
    });
    return rows;
  }

  async listEmployees(
    organizationId: string,
    filters: EmployeeListFilters,
  ): Promise<PaginatedEmployees> {
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
      ...(filters.status ? { employmentStatus: filters.status } : {}),
      ...(filters.department
        ? { department: { equals: filters.department, mode: 'insensitive' } }
        : {}),
      ...(filters.employmentType ? { employmentType: filters.employmentType } : {}),
      ...(filters.search?.trim()
        ? {
            OR: [
              { employeeCode: { contains: filters.search.trim(), mode: 'insensitive' } },
              { displayName: { contains: filters.search.trim(), mode: 'insensitive' } },
              { workEmail: { contains: filters.search.trim(), mode: 'insensitive' } },
              { phone: { contains: filters.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.EmployeeOrderByWithRelationInput[] =
      filters.sortBy === 'employeeCode'
        ? [{ employeeCode: filters.sortDir }]
        : filters.sortBy === 'dateOfJoining'
          ? [{ dateOfJoining: filters.sortDir }]
          : filters.sortBy === 'updatedAt'
            ? [{ updatedAt: filters.sortDir }]
            : [{ displayName: filters.sortDir }];

    const skip = (filters.page - 1) * filters.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        orderBy,
        skip,
        take: filters.pageSize,
        include: { reportingManager: managerSelect },
      }),
    ]);

    return {
      items: rows.map((row) => this.toRecord(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getEmployee(organizationId: string, employeeId: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { reportingManager: managerSelect },
    });
    return row ? this.toRecord(row) : null;
  }

  async createEmployee(
    organizationId: string,
    employeeId: string,
    input: CreateEmployeeInput,
    adminId: string,
  ): Promise<EmployeeRecord> {
    const displayName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    let row: EmployeeRow;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const seq = await this.nextSequence(tx, organizationId);
        const employeeCode = formatEmployeeCode(seq);
        const created = await tx.employee.create({
          data: {
            id: employeeId,
            organizationId,
            employeeCode,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            displayName,
            workEmail: input.workEmail,
            phone: input.phone,
            alternatePhone: input.alternatePhone ?? null,
            profileImageUrl: input.profileImageUrl ?? null,
            jobTitle: input.jobTitle.trim(),
            department: input.department.trim(),
            employmentType: input.employmentType,
            employmentStatus: input.employmentStatus ?? 'ACTIVE',
            dateOfJoining: parseDateOnly(input.dateOfJoining),
            probationEndDate: input.probationEndDate ? parseDateOnly(input.probationEndDate) : null,
            employmentEndDate: input.employmentEndDate
              ? parseDateOnly(input.employmentEndDate)
              : null,
            workLocation: input.workLocation?.trim() || null,
            reportingManagerId: input.reportingManagerId ?? null,
            notes: input.notes?.trim() ?? '',
            platformAdminId: input.platformAdminId ?? null,
            createdByAdminId: adminId,
            updatedByAdminId: adminId,
          },
          include: { reportingManager: managerSelect },
        });
        return created;
      });
    } catch (error) {
      rethrowEmployeeUniqueViolation(error);
      throw error;
    }
    return this.toRecord(row);
  }

  async updateEmployee(
    organizationId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    adminId: string,
  ): Promise<EmployeeRecord> {
    const existing = await this.getEmployee(organizationId, employeeId);
    if (!existing) throw new EmployeeNotFoundError();

    const firstName = input.firstName ?? existing.firstName;
    const lastName = input.lastName ?? existing.lastName;
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    let row: EmployeeRow;
    try {
      row = await this.prisma.employee.update({
        where: { id: employeeId },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
          ...(input.firstName !== undefined || input.lastName !== undefined ? { displayName } : {}),
          ...(input.workEmail !== undefined ? { workEmail: input.workEmail } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.alternatePhone !== undefined ? { alternatePhone: input.alternatePhone } : {}),
          ...(input.profileImageUrl !== undefined
            ? { profileImageUrl: input.profileImageUrl }
            : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle.trim() } : {}),
          ...(input.department !== undefined ? { department: input.department.trim() } : {}),
          ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
          ...(input.dateOfJoining !== undefined
            ? { dateOfJoining: parseDateOnly(input.dateOfJoining) }
            : {}),
          ...(input.probationEndDate !== undefined
            ? {
                probationEndDate: input.probationEndDate
                  ? parseDateOnly(input.probationEndDate)
                  : null,
              }
            : {}),
          ...(input.employmentEndDate !== undefined
            ? {
                employmentEndDate: input.employmentEndDate
                  ? parseDateOnly(input.employmentEndDate)
                  : null,
              }
            : {}),
          ...(input.workLocation !== undefined
            ? { workLocation: input.workLocation?.trim() || null }
            : {}),
          ...(input.reportingManagerId !== undefined
            ? { reportingManagerId: input.reportingManagerId }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
          ...(input.platformAdminId !== undefined ? { platformAdminId: input.platformAdminId } : {}),
          updatedByAdminId: adminId,
        },
        include: { reportingManager: managerSelect },
      });
    } catch (error) {
      rethrowEmployeeUniqueViolation(error);
      throw error;
    }
    return this.toRecord(row);
  }

  async changeEmployeeStatus(
    organizationId: string,
    employeeId: string,
    status: EmployeeRecord['employmentStatus'],
    adminId: string,
  ): Promise<EmployeeRecord> {
    const existing = await this.getEmployee(organizationId, employeeId);
    if (!existing) throw new EmployeeNotFoundError();

    const deactivatedAt =
      status === 'ACTIVE' || status === 'ON_LEAVE'
        ? null
        : status === 'INACTIVE' || status === 'TERMINATED'
          ? new Date()
          : existing.deactivatedAt
            ? new Date(existing.deactivatedAt)
            : new Date();

    const row = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        employmentStatus: status,
        deactivatedAt,
        updatedByAdminId: adminId,
      },
      include: { reportingManager: managerSelect },
    });
    return this.toRecord(row);
  }

  async deleteEmployee(organizationId: string, employeeId: string): Promise<void> {
    const existing = await this.getEmployee(organizationId, employeeId);
    if (!existing) throw new EmployeeNotFoundError();
    const directReports = await this.countDirectReports(organizationId, employeeId);
    if (directReports > 0) {
      throw new EmployeeConflictError(
        'This employee has direct reports. Reassign them before deleting this record.',
      );
    }
    await this.prisma.employee.delete({ where: { id: employeeId } });
  }
}
