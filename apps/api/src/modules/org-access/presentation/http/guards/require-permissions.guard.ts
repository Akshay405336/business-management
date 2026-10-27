import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_ERROR_CODES, type PermissionKey } from '@techwin/contracts';
import { ApiException } from '../../../../../common/filters/api-error.response.js';
import type { OrgAccessActor } from '../../../application/access/org-access-actor.js';
import { PermissionCheckerService } from '../../../application/services/permission-checker.service.js';
import type { CrmAuthenticatedRequest } from '../../../../crm/presentation/http/guards/crm-organization.guard.js';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';

export type OrgAccessAuthenticatedRequest = CrmAuthenticatedRequest & {
  orgAccess?: OrgAccessActor;
};

@Injectable()
export class RequirePermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<readonly PermissionKey[] | undefined>(
        REQUIRE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<OrgAccessAuthenticatedRequest>();
    const auth = request.platformAuth;
    const crm = request.crm;
    if (!auth || !crm) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHENTICATED,
        'Authentication is required.',
      );
    }

    const actor: OrgAccessActor = {
      organizationId: crm.organizationId,
      adminId: crm.adminId,
      isPlatformSuperAdmin: auth.admin.role === 'SUPER_ADMIN',
    };
    request.orgAccess = actor;

    await this.permissions.requirePermissions(actor, required);
    return true;
  }
}
