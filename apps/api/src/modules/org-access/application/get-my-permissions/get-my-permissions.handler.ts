import { Inject, Injectable } from '@nestjs/common';
import { EMPLOYEE_ROUTES, SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import type {
  MyOrganizationRole,
  MySessionEmployeeSummary,
  PermissionKey,
} from '@techwin/contracts';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { PermissionCheckerService } from '../services/permission-checker.service.js';
import type { GetMyPermissionsQuery } from './get-my-permissions.query.js';

export type MyAccessSnapshot = {
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
  readonly sessionEmployee: MySessionEmployeeSummary | null;
};

@Injectable()
export class GetMyPermissionsHandler {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetMyPermissionsQuery): Promise<MyAccessSnapshot> {
    const permissions = await this.permissionChecker.resolveEffectivePermissions(query.actor);
    const sessionEmployee = await this.resolveSessionEmployee(
      query.actor.organizationId,
      query.actor.adminId,
    );
    if (query.actor.isPlatformSuperAdmin) {
      return {
        permissions,
        sessionEmployee,
        roles: [
          {
            id: SYSTEM_ROLE_KEYS.owner,
            key: SYSTEM_ROLE_KEYS.owner,
            name: 'Owner',
          },
        ],
      };
    }
    const roles = await this.repository.resolveActiveMembershipRoles(
      query.actor.organizationId,
      query.actor.adminId,
    );
    return { permissions, roles: [...roles], sessionEmployee };
  }

  private async resolveSessionEmployee(
    organizationId: string,
    adminId: string,
  ): Promise<MySessionEmployeeSummary | null> {
    const row = await this.prisma.employee.findFirst({
      where: { organizationId, platformAdminId: adminId },
      select: {
        id: true,
        displayName: true,
        jobTitle: true,
        profileImageUrl: true,
        profileImageStoredObjectId: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      displayName: row.displayName,
      jobTitle: row.jobTitle,
      profileImageUrl: row.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.profileImageStoredObjectId)
        : row.profileImageUrl,
    };
  }
}
