import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';
import {
  PermissionCheckerService,
  type OrgAccessActor,
} from '../../../org-access/index.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { OrgCalendarValidationError } from '../../domain/errors/org-calendar.errors.js';

@Injectable()
export class OrgCalendarAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    private readonly prisma: PrismaService,
  ) {}

  async requirePermissions(actor: OrgAccessActor, keys: readonly PermissionKey[]): Promise<void> {
    if (actor.isPlatformSuperAdmin) return;
    const effective = new Set(await this.permissions.resolveEffectivePermissions(actor));
    if (keys.some((k) => effective.has(k))) return;
    if (keys.includes('calendar.view')) {
      try {
        await this.requireEmployeeId(actor);
        return;
      } catch {
        // fall through
      }
    }
    throw new OrgCalendarValidationError('You do not have permission to perform this action.');
  }

  async requireEmployeeId(actor: OrgAccessActor): Promise<string> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: actor.adminId },
      select: { email: true },
    });
    const adminEmail = admin?.email.trim() ?? '';
    const row = await this.prisma.employee.findFirst({
      where: {
        organizationId: actor.organizationId,
        employmentStatus: 'ACTIVE',
        deactivatedAt: null,
        OR: [
          { platformAdminId: actor.adminId },
          ...(adminEmail.length > 0
            ? [{ workEmail: { equals: adminEmail, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (!row) {
      throw new OrgCalendarValidationError('No active employee profile is linked to your account.');
    }
    return row.id;
  }
}
