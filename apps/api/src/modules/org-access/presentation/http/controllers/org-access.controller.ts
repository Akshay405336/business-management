import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PERMISSION_DEFINITIONS,
  type CreateInvitationResponse,
  type MyPermissionsResponse,
  type OrgAccessSummaryResponse,
  type OrgMemberDetail,
  type OrgMemberListResponse,
  type OrgRoleListResponse,
  type PermissionCatalogResponse,
} from '@techwin/contracts';
import {
  acceptInvitationRequestSchema,
  assignMemberRolesRequestSchema,
  changeMemberStatusRequestSchema,
  createRoleRequestSchema,
  inviteMemberRequestSchema,
  parseOrgMemberListQuery,
  setRolePermissionsRequestSchema,
  updateRoleRequestSchema,
} from '@techwin/validation';
import {
  parseProvisionMemberRequest,
  parseResetMemberPasswordRequest,
  parseUpdateMemberRequest,
} from '../dto/org-access-body.schemas.js';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import { CrmContext } from '../../../../crm/presentation/http/guards/crm-context.decorator.js';
import {
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../crm/presentation/http/guards/crm-organization.guard.js';
import { AcceptInvitationHandler } from '../../../application/accept-invitation/accept-invitation.handler.js';
import { ProvisionMemberHandler } from '../../../application/provision-member/provision-member.handler.js';
import { ResetMemberPasswordHandler } from '../../../application/reset-member-password/reset-member-password.handler.js';
import { PermissionCheckerService } from '../../../application/services/permission-checker.service.js';
import { toOrgMemberListFilters } from '../../../application/shared/org-member-list-query.js';
import { OrgAccessNotFoundError } from '../../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../../domain/repositories/org-access.repository.js';
import { RequirePermissions } from '../decorators/require-permissions.decorator.js';
import { OrgAccessExceptionFilter } from '../filters/org-access-exception.filter.js';
import { RequirePermissionsGuard } from '../guards/require-permissions.guard.js';
import { toOrgAccessActor } from '../mappers/org-access-actor.mapper.js';
import {
  toOrgMemberDetail,
  toOrgMemberListItem,
  toOrgRoleListItem,
} from '../mappers/org-access-response.mapper.js';

@ApiTags('Organization access')
@Controller('org-access')
@UseFilters(OrgAccessExceptionFilter)
export class OrgAccessController {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(AcceptInvitationHandler) private readonly acceptInvitation: AcceptInvitationHandler,
    @Inject(ProvisionMemberHandler) private readonly provisionMember: ProvisionMemberHandler,
    @Inject(ResetMemberPasswordHandler) private readonly resetMemberPassword: ResetMemberPasswordHandler,
  ) {}

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a member invitation' })
  async accept(@Body() raw: unknown): Promise<{ organizationId: string; adminId: string }> {
    const body = acceptInvitationRequestSchema.parse(raw);
    return this.acceptInvitation.execute(body);
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'User management summary counts' })
  async summary(@CrmContext() ctx: CrmRequestContext): Promise<OrgAccessSummaryResponse> {
    return this.repository.getSummary(ctx.organizationId);
  }

  @Get('me/permissions')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard)
  @ApiOperation({ summary: 'Effective permissions for the current member' })
  async myPermissions(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request & { platformAuth?: { admin: { role: string } } },
  ): Promise<MyPermissionsResponse> {
    const actor = toOrgAccessActor(ctx, request.platformAuth?.admin.role === 'SUPER_ADMIN');
    const permissions = await this.permissionChecker.resolveEffectivePermissions(actor);
    return { permissions: [...permissions] };
  }

  @Get('permissions')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Permission catalog' })
  permissionsCatalog(): PermissionCatalogResponse {
    return { permissions: [...PERMISSION_DEFINITIONS] };
  }

  @Get('members')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<OrgMemberListResponse> {
    const query = parseOrgMemberListQuery(request.query);
    const result = await this.repository.listMembers(
      ctx.organizationId,
      toOrgMemberListFilters(query),
    );
    return {
      items: result.items.map(toOrgMemberListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Post('members')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.create', 'memberships.manage')
  @ApiOperation({ summary: 'Create a member account with credentials' })
  async provision(@CrmContext() ctx: CrmRequestContext, @Body() raw: unknown) {
    const body = parseProvisionMemberRequest(raw);
    const record = await this.provisionMember.execute({
      organizationId: ctx.organizationId,
      actorAdminId: ctx.adminId,
      email: body.email,
      displayName: body.displayName,
      phone: body.phone,
      password: body.password,
      roleIds: body.roleIds,
    });
    return toOrgMemberListItem(record);
  }

  @Get('members/:id')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.read')
  async getMember(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<OrgMemberDetail> {
    const member = await this.repository.getMember(ctx.organizationId, id);
    if (!member) throw new OrgAccessNotFoundError('Member');
    const effectivePermissions = await this.repository.resolveEffectivePermissions(
      ctx.organizationId,
      member.adminId,
      false,
    );
    return toOrgMemberDetail(member, effectivePermissions);
  }

  @Post('invitations')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('memberships.invite', 'users.create')
  async invite(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<CreateInvitationResponse> {
    const body = inviteMemberRequestSchema.parse(raw);
    return this.repository.createInvitation(
      ctx.organizationId,
      { email: body.email, roleIds: body.roleIds },
      ctx.adminId,
    );
  }

  @Post('invitations/:id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('memberships.manage')
  async revokeInvitation(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.repository.revokeInvitation(ctx.organizationId, id, ctx.adminId);
  }

  @Post('invitations/:id/resend')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('memberships.invite', 'memberships.manage')
  async resendInvitation(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string) {
    return this.repository.resendInvitation(ctx.organizationId, id, ctx.adminId);
  }

  @Post('members/:id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.reset_password')
  @ApiOperation({ summary: 'Reset a member sign-in password' })
  async resetPassword(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<void> {
    const body = parseResetMemberPasswordRequest(raw);
    await this.resetMemberPassword.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
      actorAdminId: ctx.adminId,
      password: body.password,
    });
  }

  @Patch('members/:id')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.update')
  async updateMember(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = parseUpdateMemberRequest(raw);
    const updated = await this.repository.updateMemberProfile(
      ctx.organizationId,
      id,
      {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
      },
      ctx.adminId,
    );
    return toOrgMemberListItem(updated);
  }

  @Patch('members/:id/status')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.deactivate', 'memberships.manage')
  async changeStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = changeMemberStatusRequestSchema.parse(raw);
    const updated = await this.repository.changeMemberStatus(
      ctx.organizationId,
      id,
      body.status,
      ctx.adminId,
    );
    return toOrgMemberListItem(updated);
  }

  @Patch('members/:id/roles')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.manage_roles')
  async assignRoles(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = assignMemberRolesRequestSchema.parse(raw);
    const updated = await this.repository.assignMemberRoles(
      ctx.organizationId,
      id,
      body.roleIds,
      ctx.adminId,
    );
    return toOrgMemberListItem(updated);
  }

  @Get('roles')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.read')
  async listRoles(@CrmContext() ctx: CrmRequestContext): Promise<OrgRoleListResponse> {
    const roles = await this.repository.listRoles(ctx.organizationId);
    return { items: roles.map(toOrgRoleListItem) };
  }

  @Post('roles')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.create')
  async createRole(@CrmContext() ctx: CrmRequestContext, @Body() raw: unknown) {
    const body = createRoleRequestSchema.parse(raw);
    const role = await this.repository.createRole(
      ctx.organizationId,
      {
        key: body.key,
        name: body.name,
        description: body.description ?? '',
        permissionKeys: body.permissionKeys,
      },
      ctx.adminId,
    );
    return toOrgRoleListItem(role);
  }

  @Patch('roles/:id')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.update')
  async updateRole(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = updateRoleRequestSchema.parse(raw);
    const role = await this.repository.updateRole(ctx.organizationId, id, body, ctx.adminId);
    return toOrgRoleListItem(role);
  }

  @Patch('roles/:id/permissions')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.update')
  async setRolePermissions(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = setRolePermissionsRequestSchema.parse(raw);
    const role = await this.repository.setRolePermissions(
      ctx.organizationId,
      id,
      body.permissionKeys,
      ctx.adminId,
    );
    return toOrgRoleListItem(role);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.delete')
  async deleteRole(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.repository.deleteRole(ctx.organizationId, id, ctx.adminId);
  }
}
