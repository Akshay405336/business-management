import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { API_ERROR_CODES } from '@techwin/contracts';
import type { Request } from 'express';
import { ApiException } from '../../../../common/filters/api-error.response.js';
import { PermissionCheckerService } from '../../../org-access/index.js';
import type { WhatsAppActor } from '../../application/whatsapp-access.js';
import { WhatsAppInboxService } from '../../application/whatsapp-inbox.service.js';

type GuardedRequest = Request & {
  orgAccess?: { organizationId: string; adminId: string; isPlatformSuperAdmin: boolean };
  whatsappActor?: WhatsAppActor;
};

/** Builds the inbox actor from the membership already verified by RequirePermissionsGuard. */
@Injectable()
export class WhatsAppActorResolver {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService,
  ) {}

  async resolve(request: Request): Promise<WhatsAppActor> {
    const guarded = request as GuardedRequest;
    if (guarded.whatsappActor) return guarded.whatsappActor;
    const access = guarded.orgAccess;
    if (!access) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHENTICATED,
        'Authentication is required.',
      );
    }
    const [effective, employeeId] = await Promise.all([
      this.permissions.resolveEffectivePermissions(access),
      this.inbox.resolveEmployeeId(access.organizationId, access.adminId),
    ]);
    const keys = new Set<string>(effective);
    const actor: WhatsAppActor = {
      organizationId: access.organizationId,
      adminId: access.adminId,
      employeeId,
      canViewAll: keys.has('whatsapp.view_all'),
      canReply: keys.has('whatsapp.reply'),
      canAssign: keys.has('whatsapp.assign'),
    };
    guarded.whatsappActor = actor;
    return actor;
  }
}
