import { Inject, Injectable } from '@nestjs/common';
import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import type { MyOrganizationRole, PermissionKey } from '@techwin/contracts';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { PermissionCheckerService } from '../services/permission-checker.service.js';
import type { GetMyPermissionsQuery } from './get-my-permissions.query.js';

export type MyAccessSnapshot = {
  readonly permissions: readonly PermissionKey[];
  readonly roles: readonly MyOrganizationRole[];
};

@Injectable()
export class GetMyPermissionsHandler {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  async execute(query: GetMyPermissionsQuery): Promise<MyAccessSnapshot> {
    const permissions = await this.permissionChecker.resolveEffectivePermissions(query.actor);
    if (query.actor.isPlatformSuperAdmin) {
      return {
        permissions,
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
    return { permissions, roles: [...roles] };
  }
}
