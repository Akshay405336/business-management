import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { formatEmployeeCode } from '@techwin/validation';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import { EMPLOYEE_SEQUENCE_KEY } from '../../../domain/constants/employee-sequence.js';
import {
  EmployeeNotFoundError,
  EmployeeValidationError,
} from '../../../domain/errors/employee.errors.js';
import type {
  CreateEmployeeInput,
  EmployeeListFilters,
  EmployeeRecord,
  EmployeeRepository,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../../../domain/repositories/employee.repository.js';
import {
  salaryCreateData,
  salaryUpdateData,
  toSalaryRecord,
} from './employee-salary.mapper.js';
import { rethrowEmployeeUniqueViolation } from './employee-unique-violation.js';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new EmployeeValidationError('Invalid date value.');
  }
  return parsed;
};

type EmployeeRow = Prisma.EmployeeGetPayload<{ include: { salaryStructure: true } }>;

type EmployeeListRow = Prisma.EmployeeGetPayload<Record<string, never>>;

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: EmployeeListRow | EmployeeRow): EmployeeRecord {
    const salaryRow =
      'salaryStructure' in row ? row.salaryStructure : null;
    return {
      id: row.id,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      workEmail: row.workEmail,
      phone: row.phone,
      alternatePhone: row.alternatePhone,
      profileImageUrl: row.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.profileImageStoredObjectId)
        : row.profileImageUrl,
      jobTitle: row.jobTitle,
      employmentType: row.employmentType,
      employmentStatus: row.employmentStatus,
      dateOfJoining: dateOnly(row.dateOfJoining),
      probationEndDate: row.probationEndDate ? dateOnly(row.probationEndDate) : null,
      employmentEndDate: row.employmentEndDate ? dateOnly(row.employmentEndDate) : null,
      workLocation: row.workLocation,
      notes: row.notes,
      platformAdminId: row.platformAdminId,
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      salaryStructure: toSalaryRecord(salaryRow),
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

  async listEmployees(
    organizationId: string,
    filters: EmployeeListFilters,
  ): Promise<PaginatedEmployees> {
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
      ...(filters.status ? { employmentStatus: filters.status } : {}),
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
      include: { salaryStructure: true },
    });
    return row ? this.toRecord(row) : null;
  }

  async getProfileImageStoredObjectId(
    organizationId: string,
    employeeId: string,
  ): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { profileImageStoredObjectId: true },
    });
    return row?.profileImageStoredObjectId ?? null;
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
            profileImageUrl: input.profileImageStoredObjectId
              ? null
              : (input.profileImageUrl ?? null),
            profileImageStoredObjectId: input.profileImageStoredObjectId ?? null,
            jobTitle: input.jobTitle.trim(),
            employmentType: input.employmentType,
            employmentStatus: 'ACTIVE',
            dateOfJoining: parseDateOnly(input.dateOfJoining),
            probationEndDate: input.probationEndDate ? parseDateOnly(input.probationEndDate) : null,
            employmentEndDate: input.employmentEndDate
              ? parseDateOnly(input.employmentEndDate)
              : null,
            workLocation: input.workLocation?.trim() || null,
            notes: input.notes?.trim() ?? '',
            platformAdminId: input.platformAdminId ?? null,
            createdByAdminId: adminId,
            updatedByAdminId: adminId,
          },
          include: { salaryStructure: true },
        });
        if (input.salaryStructure) {
          await tx.employeeSalaryStructure.create({
            data: salaryCreateData(
              organizationId,
              employeeId,
              randomUUID(),
              input.salaryStructure,
            ),
          });
        }
        const withSalary = await tx.employee.findFirstOrThrow({
          where: { id: employeeId },
          include: { salaryStructure: true },
        });
        return withSalary;
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
          ...(input.profileImageStoredObjectId !== undefined
            ? {
                profileImageStoredObjectId: input.profileImageStoredObjectId,
                profileImageUrl: null,
              }
            : input.profileImageUrl !== undefined
              ? { profileImageUrl: input.profileImageUrl }
              : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle.trim() } : {}),
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
          ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
          ...(input.platformAdminId !== undefined ? { platformAdminId: input.platformAdminId } : {}),
          updatedByAdminId: adminId,
        },
        include: { salaryStructure: true },
      });
      if (input.salaryStructure !== undefined) {
        if (input.salaryStructure === null) {
          await this.prisma.employeeSalaryStructure.deleteMany({
            where: { employeeId, organizationId },
          });
        } else {
          await this.prisma.employeeSalaryStructure.upsert({
            where: { employeeId },
            create: salaryCreateData(
              organizationId,
              employeeId,
              randomUUID(),
              input.salaryStructure,
            ),
            update: salaryUpdateData(input.salaryStructure),
          });
        }
        const refreshed = await this.prisma.employee.findFirstOrThrow({
          where: { id: employeeId },
          include: { salaryStructure: true },
        });
        return this.toRecord(refreshed);
      }
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
    });
    return this.toRecord(row);
  }

  async deleteEmployee(organizationId: string, employeeId: string): Promise<void> {
    const existing = await this.getEmployee(organizationId, employeeId);
    if (!existing) throw new EmployeeNotFoundError();
    await this.prisma.employee.delete({ where: { id: employeeId } });
  }
}
