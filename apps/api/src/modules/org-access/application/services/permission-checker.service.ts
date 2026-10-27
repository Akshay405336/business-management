import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';
import type { OrgAccessActor } from '../access/org-access-actor.js';
import { OrgAccessForbiddenError } from '../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';

@Injectable()
export class PermissionCheckerService {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly orgAccess: OrgAccessRepository,
  ) {}

  async resolveEffectivePermissions(actor: OrgAccessActor): Promise<readonly PermissionKey[]> {
    await this.orgAccess.assertActiveMembership(actor.organizationId, actor.adminId);
    return this.orgAccess.resolveEffectivePermissions(
      actor.organizationId,
      actor.adminId,
      actor.isPlatformSuperAdmin,
    );
  }

  async hasAllPermissions(
    actor: OrgAccessActor,
    required: readonly PermissionKey[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const effective = new Set(await this.resolveEffectivePermissions(actor));
    return required.every((key) => effective.has(key));
  }

  async requirePermissions(
    actor: OrgAccessActor,
    required: readonly PermissionKey[],
  ): Promise<void> {
    if (required.length === 0) return;
    const effective = new Set(await this.resolveEffectivePermissions(actor));
    const allowed = required.some((key) => effective.has(key));
    if (!allowed) {
      throw new OrgAccessForbiddenError('You do not have permission to perform this action.');
    }
  }
}
