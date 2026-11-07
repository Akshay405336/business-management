import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../../../../generated/prisma/client.js';
import type { LeaveTypeItem, LeaveTypeListResponse, LeaveTypeStatus } from '@techwin/contracts';
import { PrismaService } from '../../../../../../../../infrastructure/database/prisma.service.js';
import { LeaveConflictError, LeaveNotFoundError } from '../../../../../../domain/errors/leave.errors.js';
import type { LeaveTypeRepository } from '../../../../domain/repositories/leave-type.repository.js';
import type {
  CreateLeaveTypeData,
  LeaveTypeDependencyCounts,
  LeaveTypeListFilters,
  UpdateLeaveTypeData,
} from '../../../../domain/types/leave-type.types.js';
import { toLeaveTypeItem } from '../mappers/leave-type.mapper.js';

@Injectable()
export class PrismaLeaveTypeRepository implements LeaveTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLeaveTypes(
    organizationId: string,
    filters: LeaveTypeListFilters,
  ): Promise<LeaveTypeListResponse> {
    const where: Prisma.LeaveTypeWhereInput = { organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.kind) where.kind = filters.kind;
    if (filters.search) {
      const q = filters.search.trim();
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.leaveType.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: filters.pageSize,
      }),
      this.prisma.leaveType.count({ where }),
    ]);
    return {
      items: rows.map(toLeaveTypeItem),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getLeaveType(organizationId: string, leaveTypeId: string): Promise<LeaveTypeItem> {
    const row = await this.prisma.leaveType.findFirst({
      where: { id: leaveTypeId, organizationId },
    });
    if (!row) throw new LeaveNotFoundError('Leave type');
    return toLeaveTypeItem(row);
  }

  async listCodes(organizationId: string): Promise<readonly string[]> {
    const rows = await this.prisma.leaveType.findMany({
      where: { organizationId },
      select: { code: true },
    });
    return rows.map((row) => row.code);
  }

  async findIdByNameInsensitive(
    organizationId: string,
    name: string,
    excludeId?: string,
  ): Promise<string | null> {
    const row = await this.prisma.leaveType.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async createLeaveType(
    organizationId: string,
    adminId: string,
    input: CreateLeaveTypeData,
    code: string,
  ): Promise<LeaveTypeItem> {
    try {
      const row = await this.prisma.leaveType.create({
        data: {
          id: randomUUID(),
          organizationId,
          name: input.name,
          code,
          description: input.description,
          kind: input.kind,
          status: 'ACTIVE',
          createdByAdminId: adminId,
          updatedByAdminId: adminId,
        },
      });
      return toLeaveTypeItem(row);
    } catch (error) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  async updateLeaveType(
    organizationId: string,
    leaveTypeId: string,
    adminId: string,
    input: UpdateLeaveTypeData,
  ): Promise<LeaveTypeItem> {
    await this.getLeaveType(organizationId, leaveTypeId);
    try {
      const row = await this.prisma.leaveType.update({
        where: { id: leaveTypeId },
        data: {
          name: input.name,
          description: input.description,
          kind: input.kind,
          updatedByAdminId: adminId,
        },
      });
      return toLeaveTypeItem(row);
    } catch (error) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  async changeLeaveTypeStatus(
    organizationId: string,
    leaveTypeId: string,
    adminId: string,
    status: LeaveTypeStatus,
  ): Promise<LeaveTypeItem> {
    await this.getLeaveType(organizationId, leaveTypeId);
    const row = await this.prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: { status, updatedByAdminId: adminId },
    });
    return toLeaveTypeItem(row);
  }

  async countDependencies(
    organizationId: string,
    leaveTypeId: string,
  ): Promise<LeaveTypeDependencyCounts> {
    const [requestCount, balanceCount, allocationCount] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { organizationId, leaveTypeId } }),
      this.prisma.employeeLeaveBalance.count({ where: { organizationId, leaveTypeId } }),
      this.prisma.leaveYearAllocation.count({ where: { organizationId, leaveTypeId } }),
    ]);
    return { requestCount, balanceCount, allocationCount };
  }

  async deleteLeaveType(organizationId: string, leaveTypeId: string): Promise<void> {
    await this.getLeaveType(organizationId, leaveTypeId);
    await this.prisma.leaveType.delete({ where: { id: leaveTypeId } });
  }

  private rethrowUniqueViolation(error: unknown): void {
    if (!this.isUniqueViolation(error)) return;
    const target = this.uniqueTarget(error);
    if (target.includes('name')) {
      throw new LeaveConflictError('A leave type with this name already exists.');
    }
    throw new LeaveConflictError('A leave type with this code already exists.');
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  private uniqueTarget(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('meta' in error)) return '';
    const meta = (error as { meta?: { target?: unknown } }).meta;
    if (!meta) return '';
    if (Array.isArray(meta.target)) return meta.target.map(String).join(' ');
    return typeof meta.target === 'string' ? meta.target : '';
  }
}
