import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { PasswordHashingModule } from '../../infrastructure/security/password-hashing/password-hashing.module.js';
import { TotpModule } from '../../infrastructure/security/totp/totp.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/crm.module.js';
import { PLATFORM_TOTP_SECRET_PROTECTOR } from '../auth/domain/services/platform-totp-secret-protector.js';
import { PlatformTotpSecretResolver } from '../auth/infrastructure/totp/platform-totp-secret-resolver.js';
import { AcceptInvitationHandler } from './application/accept-invitation/accept-invitation.handler.js';
import { ProvisionMemberHandler } from './application/provision-member/provision-member.handler.js';
import { ResetMemberPasswordHandler } from './application/reset-member-password/reset-member-password.handler.js';
import { PermissionCheckerService } from './application/services/permission-checker.service.js';
import { ORG_ACCESS_REPOSITORY } from './domain/repositories/org-access.repository.js';
import { PrismaOrgAccessRepository } from './infrastructure/persistence/prisma/prisma-org-access.repository.js';
import { OrgAccessController } from './presentation/http/controllers/org-access.controller.js';
import { OrgAccessExceptionFilter } from './presentation/http/filters/org-access-exception.filter.js';
import { RequirePermissionsGuard } from './presentation/http/guards/require-permissions.guard.js';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    AuthModule,
    PasswordHashingModule,
    TotpModule,
    forwardRef(() => CrmModule),
  ],
  controllers: [OrgAccessController],
  providers: [
    { provide: ORG_ACCESS_REPOSITORY, useClass: PrismaOrgAccessRepository },
    { provide: PLATFORM_TOTP_SECRET_PROTECTOR, useClass: PlatformTotpSecretResolver },
    PermissionCheckerService,
    RequirePermissionsGuard,
    AcceptInvitationHandler,
    ProvisionMemberHandler,
    ResetMemberPasswordHandler,
    OrgAccessExceptionFilter,
  ],
  exports: [
    ORG_ACCESS_REPOSITORY,
    PermissionCheckerService,
    RequirePermissionsGuard,
    OrgAccessExceptionFilter,
  ],
})
export class OrgAccessModule {}
