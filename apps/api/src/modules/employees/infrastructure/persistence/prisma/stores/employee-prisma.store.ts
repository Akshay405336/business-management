import { randomUUID } from 'node:crypto';
import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { type MemberAccountTransactionPort } from '../../../../../org-access/index.js';
import { EMPLOYEE_SEQUENCE_KEY } from '../../../../domain/constants/employee-sequence.js';
import {
  EmployeeNotFoundError,
  EmployeeValidationError,
} from '../../../../domain/errors/employee.errors.js';
import { EmployeeDeletionPolicy } from '../../../../domain/policies/employee-deletion.policy.js';
import { EmployeeStatusPolicy } from '../../../../domain/policies/employee-status.policy.js';
import { EmployeeNumberService } from '../../../../domain/services/employee-number.service.js';
import { EmployeeName } from '../../../../domain/value-objects/employee-name.vo.js';
import type {
  AssignableEmployeeRecord,
  CreateEmployeeInput,
  EmployeeDailyTaskDeletionImpact,
  EmployeeDeletionResult,
  EmployeeDeletionTarget,
  EmployeeListFilters,
  EmployeeLoginDeletionOutcome,
  EmployeeLoginAccessRecord,
  EmployeeRecord,
  NewEmployeeLoginAccount,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../../../../domain/repositories/employee.repository.js';
import {
  salaryCreateData,
  salaryUpdateData,
  toSalaryRecord,
} from '../mappers/employee-salary.mapper.js';
import { rethrowEmployeeUniqueViolation } from '../mappers/employee-unique-violation.js';

const PENDING_DAILY_TASK_SAMPLE = 25;

function pendingDailyTaskWhere(
  organizationId: string,
  employeeId: string,
): Prisma.DailyTaskAssigneeWhereInput {
  return {
    organizationId,
    employeeId,
    dailyTask: {
      OR: [{ workflowStageId: null }, { workflowStage: { isCompletedStage: false } }],
    },
  };
}

function completedDailyTaskWhere(
  organizationId: string,
  employeeId: string,
): Prisma.DailyTaskAssigneeWhereInput {
  return {
    organizationId,
    employeeId,
    dailyTask: { workflowStage: { isCompletedStage: true } },
  };
}

async function readDailyTaskDeletionImpact(
  db: Prisma.TransactionClient | PrismaService,
  organizationId: string,
  employeeId: string,
): Promise<EmployeeDailyTaskDeletionImpact> {
  const [pendingTaskCount, completedTaskCount, rows] = await Promise.all([
    db.dailyTaskAssignee.count({ where: pendingDailyTaskWhere(organizationId, employeeId) }),
    db.dailyTaskAssignee.count({ where: completedDailyTaskWhere(organizationId, employeeId) }),
    db.dailyTaskAssignee.findMany({
      where: pendingDailyTaskWhere(organizationId, employeeId),
      orderBy: { createdAt: 'asc' },
      take: PENDING_DAILY_TASK_SAMPLE,
      select: {
        dailyTask: {
          select: {
            id: true,
            title: true,
            workflowStage: { select: { stageKey: true } },
          },
        },
      },
    }),
  ]);
  return {
    pendingTaskCount,
    completedTaskCount,
    tasks: rows.map((row) => ({
      id: row.dailyTask.id,
      title: row.dailyTask.title,
      status: row.dailyTask.workflowStage?.stageKey ?? 'unassigned',
    })),
  };
}

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new EmployeeValidationError('Invalid date value.');
  }
  return parsed;
};

/** Login access for the employee's linked account in this organization only. */
function loginAccessInclude(organizationId: string) {
  return {
    platformAdmin: {
      select: {
        lastLoginAt: true,
        memberships: {
          where: { organizationId },
          select: {
            id: true,
            status: true,
            isOwner: true,
            roleLinks: {
              select: { role: { select: { id: true, key: true, name: true, status: true } } },
            },
          },
        },
      },
    },
  } as const;
}

function detailInclude(organizationId: string) {
  return { ...loginAccessInclude(organizationId), salaryStructure: true } as const;
}

type EmployeeRow = Prisma.EmployeeGetPayload<{ include: ReturnType<typeof detailInclude> }>;

type EmployeeListRow = Prisma.EmployeeGetPayload<{
  include: ReturnType<typeof loginAccessInclude>;
}>;

const DUPLICATE_ACCOUNT_MESSAGE = 'A sign-in account already exists for this email.';

export class EmployeePrismaStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberAccounts: MemberAccountTransactionPort,
  ) {}

  private toLoginAccess(row: EmployeeListRow): EmployeeLoginAccessRecord | null {
    const membership = row.platformAdmin?.memberships[0];
    if (!row.platformAdmin || !membership) return null;
    return {
      membershipId: membership.id,
      status: membership.status,
      isOwner: membership.isOwner,
      ownsAccount: row.ownsLoginAccount,
      roles: membership.roleLinks
        .map((link) => link.role)
        .filter((role) => role.status === 'ACTIVE')
        .map((role) => ({ id: role.id, key: role.key, name: role.name })),
      lastLoginAt: row.platformAdmin.lastLoginAt?.toISOString() ?? null,
    };
  }

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
      department: row.department,
      employmentType: row.employmentType,
      employmentStatus: row.employmentStatus,
      dateOfJoining: dateOnly(row.dateOfJoining),
      probationEndDate: row.probationEndDate ? dateOnly(row.probationEndDate) : null,
      employmentEndDate: row.employmentEndDate ? dateOnly(row.employmentEndDate) : null,
      workLocation: row.workLocation,
      notes: row.notes,
      platformAdminId: row.platformAdminId,
      loginAccess: this.toLoginAccess(row),
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
    return EmployeeNumberService.previewFromLastValue(row?.lastValue ?? null);
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
      ...(filters.accountLinkable
        ? {
            platformAdminId: null,
            employmentStatus: { in: [...EmployeeStatusPolicy.accessKeepingStatuses()] },
          }
        : {}),
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
        include: loginAccessInclude(organizationId),
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
      include: detailInclude(organizationId),
    });
    return row ? this.toRecord(row) : null;
  }

  async listAssignableEmployees(
    organizationId: string,
    search?: string,
  ): Promise<readonly AssignableEmployeeRecord[]> {
    const term = search?.trim();
    const rows = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: EmployeeStatusPolicy.assignableStatus(),
        ...(term
          ? {
              OR: [
                { displayName: { contains: term, mode: 'insensitive' } },
                { employeeCode: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ displayName: 'asc' }],
      take: 100,
      select: {
        id: true,
        employeeCode: true,
        displayName: true,
        jobTitle: true,
        profileImageUrl: true,
        profileImageStoredObjectId: true,
        platformAdminId: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      employeeCode: row.employeeCode,
      displayName: row.displayName,
      jobTitle: row.jobTitle,
      profileImageUrl: row.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.profileImageStoredObjectId)
        : row.profileImageUrl,
      platformAdminId: row.platformAdminId,
    }));
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
    loginAccount?: NewEmployeeLoginAccount | null,
  ): Promise<EmployeeRecord> {
    const displayName = EmployeeName.displayName(input.firstName, input.lastName);
    const employmentStatus = 'ACTIVE';
    let row: EmployeeRow;
    try {
      row = await this.prisma.$transaction(async (tx) => {
        const seq = await this.nextSequence(tx, organizationId);
        const employeeCode = EmployeeNumberService.formatFromSequence(seq);
        let platformAdminId = input.platformAdminId ?? null;
        if (loginAccount) {
          try {
            const account = await this.memberAccounts.createMemberAccountInTransaction(
              tx,
              organizationId,
              {
                account: loginAccount,
                displayName,
                phone: input.phone,
                membershipStatus: EmployeeStatusPolicy.retainsSignInAccess(employmentStatus)
                  ? 'ACTIVE'
                  : 'DEACTIVATED',
                auditMetadata: { employeeId },
              },
              adminId,
            );
            platformAdminId = account.adminId;
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              throw new EmployeeValidationError(DUPLICATE_ACCOUNT_MESSAGE, [
                { path: 'workEmail', message: DUPLICATE_ACCOUNT_MESSAGE },
              ]);
            }
            throw error;
          }
        }
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
            department: input.department?.trim() || null,
            employmentType: input.employmentType,
            employmentStatus,
            deactivatedAt: EmployeeStatusPolicy.retainsSignInAccess(employmentStatus)
              ? null
              : new Date(),
            dateOfJoining: parseDateOnly(input.dateOfJoining),
            probationEndDate: input.probationEndDate ? parseDateOnly(input.probationEndDate) : null,
            employmentEndDate: input.employmentEndDate
              ? parseDateOnly(input.employmentEndDate)
              : null,
            workLocation: input.workLocation?.trim() || null,
            notes: input.notes?.trim() ?? '',
            platformAdminId,
            ownsLoginAccount: Boolean(loginAccount),
            createdByAdminId: adminId,
            updatedByAdminId: adminId,
          },
          select: { id: true },
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
        await tx.crmAuditEvent.create({
          data: {
            organizationId,
            adminId,
            type: 'EMPLOYEE_CREATED',
            entityType: 'employee',
            entityId: created.id,
            metadata: {
              employeeCode,
              loginAccountCreated: Boolean(loginAccount),
              linkedExistingAccount: Boolean(platformAdminId && !loginAccount),
            },
          },
        });
        return tx.employee.findFirstOrThrow({
          where: { id: employeeId },
          include: detailInclude(organizationId),
        });
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
    const displayName = EmployeeName.displayName(firstName, lastName);

    const changedFields = (Object.keys(input) as (keyof UpdateEmployeeInput)[]).filter(
      (key) => key !== 'salaryStructure' && input[key] !== undefined,
    );
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const owned = await tx.employee.findFirst({
          where: { id: employeeId, organizationId },
          select: { id: true },
        });
        if (!owned) throw new EmployeeNotFoundError();
        await tx.employee.update({
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
            ...(input.department !== undefined
              ? { department: input.department?.trim() || null }
              : {}),
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
            updatedByAdminId: adminId,
          },
        });
        if (input.salaryStructure !== undefined) {
          if (input.salaryStructure === null) {
            await tx.employeeSalaryStructure.deleteMany({
              where: { employeeId, organizationId },
            });
          } else {
            await tx.employeeSalaryStructure.upsert({
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
        }
        await tx.crmAuditEvent.create({
          data: {
            organizationId,
            adminId,
            type: 'EMPLOYEE_UPDATED',
            entityType: 'employee',
            entityId: employeeId,
            metadata: {
              changedFields,
              compensationChanged: input.salaryStructure !== undefined,
            },
          },
        });
        return tx.employee.findFirstOrThrow({
          where: { id: employeeId, organizationId },
          include: detailInclude(organizationId),
        });
      });
      return this.toRecord(row);
    } catch (error) {
      rethrowEmployeeUniqueViolation(error);
      throw error;
    }
  }

  async changeEmployeeStatus(
    organizationId: string,
    employeeId: string,
    status: EmployeeRecord['employmentStatus'],
    adminId: string,
  ): Promise<EmployeeRecord> {
    const existing = await this.getEmployee(organizationId, employeeId);
    if (!existing) throw new EmployeeNotFoundError();

    const deactivatedAt = EmployeeStatusPolicy.retainsSignInAccess(status) ? null : new Date();

    const row = await this.prisma.$transaction(async (tx) => {
      const owned = await tx.employee.findFirst({
        where: { id: employeeId, organizationId },
        select: { id: true },
      });
      if (!owned) throw new EmployeeNotFoundError();
      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: {
          employmentStatus: status,
          deactivatedAt,
          updatedByAdminId: adminId,
        },
        include: detailInclude(organizationId),
      });
      await tx.crmAuditEvent.create({
        data: {
          organizationId,
          adminId,
          type: 'EMPLOYEE_STATUS_CHANGED',
          entityType: 'employee',
          entityId: employeeId,
          metadata: { from: existing.employmentStatus, to: status },
        },
      });
      return updated;
    });
    return this.toRecord(row);
  }

  async getDeletionTarget(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDeletionTarget | null> {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { platformAdminId: true, ownsLoginAccount: true, profileImageStoredObjectId: true },
    });
  }

  async getDailyTaskDeletionImpact(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDailyTaskDeletionImpact> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true },
    });
    if (!employee) throw new EmployeeNotFoundError();
    return readDailyTaskDeletionImpact(this.prisma, organizationId, employeeId);
  }

  async deleteEmployee(
    organizationId: string,
    employeeId: string,
    adminId: string,
  ): Promise<EmployeeDeletionResult> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM employees
        WHERE id = ${employeeId}::uuid AND organization_id = ${organizationId}::uuid
        FOR UPDATE
      `);
      if (locked.length === 0) throw new EmployeeNotFoundError();
      await tx.$queryRaw(Prisma.sql`
        SELECT assignee.id
        FROM daily_task_assignees AS assignee
        INNER JOIN daily_tasks AS task ON task.id = assignee.daily_task_id
        WHERE assignee.organization_id = ${organizationId}::uuid
          AND assignee.employee_id = ${employeeId}::uuid
        FOR UPDATE OF assignee, task
      `);

      const existing = await tx.employee.findFirst({
        where: { id: employeeId, organizationId },
        select: {
          employeeCode: true,
          displayName: true,
          workEmail: true,
          platformAdminId: true,
          ownsLoginAccount: true,
          profileImageStoredObjectId: true,
          _count: { select: { whatsappConversations: true } },
        },
      });
      if (!existing) throw new EmployeeNotFoundError();

      const impact = await readDailyTaskDeletionImpact(tx, organizationId, employeeId);
      EmployeeDeletionPolicy.assertNoPendingDailyTasks(impact);

      await tx.dailyTaskAssignee.updateMany({
        where: { organizationId, employeeId },
        data: {
          historicalDisplayName: existing.displayName,
          historicalEmployeeCode: existing.employeeCode,
        },
      });
      await tx.dailyTaskNote.updateMany({
        where: { organizationId, employeeId },
        data: { historicalDisplayName: existing.displayName },
      });

      const loginAccount: EmployeeLoginDeletionOutcome = existing.platformAdminId
        ? await this.memberAccounts.removeEmployeeLoginInTransaction(tx, organizationId, {
            adminId: existing.platformAdminId,
            ownedByEmployee: existing.ownsLoginAccount,
          })
        : 'NONE';

      await tx.employee.delete({ where: { id: employeeId } });
      await tx.crmAuditEvent.create({
        data: {
          organizationId,
          adminId,
          type: 'EMPLOYEE_DELETED',
          entityType: 'employee',
          entityId: employeeId,
          metadata: {
            employeeCode: existing.employeeCode,
            displayName: existing.displayName,
            workEmail: existing.workEmail,
            loginAccount,
            preservedCompletedTaskAssignments: impact.completedTaskCount,
            unassignedConversations: existing._count.whatsappConversations,
          },
        },
      });
      return {
        loginAccount,
        platformAdminId: existing.platformAdminId,
        profileImageStoredObjectId: existing.profileImageStoredObjectId,
      };
    });
  }
}
