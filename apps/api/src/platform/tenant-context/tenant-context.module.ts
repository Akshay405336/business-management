import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/index.js';
import { CrmModule } from '../../modules/crm/index.js';
import { OrgAccessModule } from '../../modules/org-access/index.js';
import { CrmOrganizationGuard } from './crm-organization.guard.js';

/** Shared tenant resolution for authenticated organization-scoped routes. */
@Global()
@Module({
  imports: [AuthModule, CrmModule, OrgAccessModule],
  providers: [CrmOrganizationGuard],
  exports: [CrmOrganizationGuard],
})
export class TenantContextModule {}
