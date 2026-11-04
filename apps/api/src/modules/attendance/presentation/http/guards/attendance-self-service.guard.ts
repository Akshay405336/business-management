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
import type { OrgAccessActor } from '../../../../org-access/application/shared/org-access-actor.js';
import { PermissionCheckerService } from '../../../../org-access/application/services/permission-checker.service.js';
import { AttendanceAuthorizationService } from '../../../application/services/attendance-authorization.service.js';
import type { CrmAuthenticatedRequest } from '../../../../../platform/tenant-context/crm-organization.guard.js';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../org-access/presentation/http/decorators/require-permissions.decorator.js';

/**
 * Like {@link RequirePermissionsGuard}, but allows employee self-service when the actor has an
 * active linked employee profile even if role rows are out of sync.
 */
@Injectable()
export class AttendanceSelfServiceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(AttendanceAuthorizationService) private readonly attendanceAuthz: AttendanceAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<readonly PermissionKey[] | undefined>(
        REQUIRE_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest<CrmAuthenticatedRequest>();
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

    const effective = new Set(await this.permissions.resolveEffectivePermissions(actor));
    if (required.some((key) => effective.has(key))) {
      return true;
    }

    const selfServiceKeys = new Set<PermissionKey>([
      'attendance.view_own',
      'attendance.punch_in',
      'attendance.punch_out',
      'attendance.view_summary',
      'attendance.manage_devices',
      'calendar.view',
    ]);
    if (required.some((key) => selfServiceKeys.has(key))) {
      try {
        await this.attendanceAuthz.requireEmployeeId(actor);
        return true;
      } catch {
        // fall through to forbidden
      }
    }

    throw new ApiException(
      HttpStatus.FORBIDDEN,
      API_ERROR_CODES.FORBIDDEN,
      'You do not have permission to perform this action.',
    );
  }
}
