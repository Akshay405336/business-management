import { Module, forwardRef, type Provider } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { PasswordHashingModule } from '../../infrastructure/security/password-hashing/password-hashing.module.js';
import { TotpModule } from '../../infrastructure/security/totp/totp.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { AcceptInvitationHandler } from './application/accept-invitation/accept-invitation.handler.js';
import { AssignMemberRolesHandler } from './application/assign-member-roles/assign-member-roles.handler.js';
import { ChangeMemberStatusHandler } from './application/change-member-status/change-member-status.handler.js';
import { CreateOrgRoleHandler } from './application/create-org-role/create-org-role.handler.js';
import { DeleteMemberHandler } from './application/delete-member/delete-member.handler.js';
import { DeleteOrgRoleHandler } from './application/delete-org-role/delete-org-role.handler.js';
import { GetMyPermissionsHandler } from './application/get-my-permissions/get-my-permissions.handler.js';
import { GetOrgAccessSummaryHandler } from './application/get-org-access-summary/get-org-access-summary.handler.js';
import { GetOrgMemberHandler } from './application/get-org-member/get-org-member.handler.js';
import { GetOrgRoleHandler } from './application/get-org-role/get-org-role.handler.js';
import { GetOrgRoleDeletionImpactHandler } from './application/get-org-role-deletion-impact/get-org-role-deletion-impact.handler.js';
import { InviteMemberHandler } from './application/invite-member/invite-member.handler.js';
import { ListOrgMembersHandler } from './application/list-org-members/list-org-members.handler.js';
import { ListOrgRolesHandler } from './application/list-org-roles/list-org-roles.handler.js';
import { ProvisionMemberHandler } from './application/provision-member/provision-member.handler.js';
import { ResendInvitationHandler } from './application/resend-invitation/resend-invitation.handler.js';
import { ResetMemberPasswordHandler } from './application/reset-member-password/reset-member-password.handler.js';
import { RevokeInvitationHandler } from './application/revoke-invitation/revoke-invitation.handler.js';
import { SetRolePermissionsHandler } from './application/set-role-permissions/set-role-permissions.handler.js';
import { MemberAccountService } from './application/services/member-account.service.js';
import { PermissionCheckerService } from './application/services/permission-checker.service.js';
import { UpdateMemberProfileHandler } from './application/update-member-profile/update-member-profile.handler.js';
import { UpdateOrgRoleHandler } from './application/update-org-role/update-org-role.handler.js';
import { ORG_ACCESS_REPOSITORY } from './domain/repositories/org-access.repository.js';
import { MEMBER_ACCOUNT_TRANSACTION } from './domain/ports/member-account-transaction.port.js';
import { PrismaMemberAccountTransactionAdapter } from './infrastructure/persistence/prisma/repositories/prisma-member-account-transaction.adapter.js';
import { PrismaOrgAccessRepository } from './infrastructure/persistence/prisma/repositories/prisma-org-access.repository.js';
import { OrgAccessController } from './presentation/http/controllers/org-access.controller.js';
import { OrgAccessExceptionFilter } from './presentation/http/filters/org-access-exception.filter.js';
import { RequirePermissionsGuard } from './presentation/http/guards/require-permissions.guard.js';

export const orgAccessPersistenceProviders: Provider[] = [
  { provide: ORG_ACCESS_REPOSITORY, useClass: PrismaOrgAccessRepository },
  PrismaMemberAccountTransactionAdapter,
  { provide: MEMBER_ACCOUNT_TRANSACTION, useExisting: PrismaMemberAccountTransactionAdapter },
];

const orgAccessUseCaseHandlers = [
  AcceptInvitationHandler,
  AssignMemberRolesHandler,
  ChangeMemberStatusHandler,
  CreateOrgRoleHandler,
  DeleteMemberHandler,
  DeleteOrgRoleHandler,
  GetMyPermissionsHandler,
  GetOrgAccessSummaryHandler,
  GetOrgMemberHandler,
  GetOrgRoleHandler,
  GetOrgRoleDeletionImpactHandler,
  InviteMemberHandler,
  ListOrgMembersHandler,
  ListOrgRolesHandler,
  ProvisionMemberHandler,
  ResendInvitationHandler,
  ResetMemberPasswordHandler,
  RevokeInvitationHandler,
  SetRolePermissionsHandler,
  UpdateMemberProfileHandler,
  UpdateOrgRoleHandler,
] as const;

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
    ...orgAccessPersistenceProviders,
    PermissionCheckerService,
    MemberAccountService,
    RequirePermissionsGuard,
    OrgAccessExceptionFilter,
    ...orgAccessUseCaseHandlers,
  ],
  exports: [
    ORG_ACCESS_REPOSITORY,
    MEMBER_ACCOUNT_TRANSACTION,
    PermissionCheckerService,
    MemberAccountService,
    RequirePermissionsGuard,
    OrgAccessExceptionFilter,
  ],
})
export class OrgAccessModule {}
