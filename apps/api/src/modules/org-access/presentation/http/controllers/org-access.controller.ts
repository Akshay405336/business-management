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
  type PermissionKey,
  type CreateInvitationResponse,
  type MyPermissionsResponse,
  type OrgAccessSummaryResponse,
  type OrgMemberDetail,
  type OrgMemberListResponse,
  type OrgRoleDeletionImpactResponse,
  type OrgRoleDetail,
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
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { AcceptInvitationHandler } from '../../../application/accept-invitation/accept-invitation.handler.js';
import { AssignMemberRolesHandler } from '../../../application/assign-member-roles/assign-member-roles.handler.js';
import { ChangeMemberStatusHandler } from '../../../application/change-member-status/change-member-status.handler.js';
import { CreateOrgRoleHandler } from '../../../application/create-org-role/create-org-role.handler.js';
import { DeleteMemberHandler } from '../../../application/delete-member/delete-member.handler.js';
import { DeleteOrgRoleHandler } from '../../../application/delete-org-role/delete-org-role.handler.js';
import { GetMyPermissionsHandler } from '../../../application/get-my-permissions/get-my-permissions.handler.js';
import { GetOrgAccessSummaryHandler } from '../../../application/get-org-access-summary/get-org-access-summary.handler.js';
import { GetOrgMemberHandler } from '../../../application/get-org-member/get-org-member.handler.js';
import { GetOrgRoleHandler } from '../../../application/get-org-role/get-org-role.handler.js';
import { GetOrgRoleDeletionImpactHandler } from '../../../application/get-org-role-deletion-impact/get-org-role-deletion-impact.handler.js';
import { InviteMemberHandler } from '../../../application/invite-member/invite-member.handler.js';
import { ListOrgMembersHandler } from '../../../application/list-org-members/list-org-members.handler.js';
import { ListOrgRolesHandler } from '../../../application/list-org-roles/list-org-roles.handler.js';
import { ProvisionMemberHandler } from '../../../application/provision-member/provision-member.handler.js';
import { ResendInvitationHandler } from '../../../application/resend-invitation/resend-invitation.handler.js';
import { ResetMemberPasswordHandler } from '../../../application/reset-member-password/reset-member-password.handler.js';
import { RevokeInvitationHandler } from '../../../application/revoke-invitation/revoke-invitation.handler.js';
import { SetRolePermissionsHandler } from '../../../application/set-role-permissions/set-role-permissions.handler.js';
import { toOrgMemberListFilters } from '../../../application/shared/org-member-list-query.js';
import { UpdateMemberProfileHandler } from '../../../application/update-member-profile/update-member-profile.handler.js';
import { UpdateOrgRoleHandler } from '../../../application/update-org-role/update-org-role.handler.js';
import { RequirePermissions } from '../decorators/require-permissions.decorator.js';
import {
  parseProvisionMemberRequest,
  parseResetMemberPasswordRequest,
  parseUpdateMemberRequest,
} from '../dto/org-access-body.schemas.js';
import { OrgAccessExceptionFilter } from '../filters/org-access-exception.filter.js';
import { RequirePermissionsGuard } from '../guards/require-permissions.guard.js';
import { toOrgAccessActor } from '../mappers/org-access-actor.mapper.js';
import {
  toOrgMemberDetail,
  toOrgMemberListItem,
  toOrgRoleDetail,
  toOrgRoleListItem,
} from '../mappers/org-access-response.mapper.js';

@ApiTags('Organization access')
@Controller('org-access')
@UseFilters(OrgAccessExceptionFilter)
export class OrgAccessController {
  constructor(
    @Inject(AcceptInvitationHandler) private readonly acceptInvitation: AcceptInvitationHandler,
    @Inject(AssignMemberRolesHandler) private readonly assignMemberRoles: AssignMemberRolesHandler,
    @Inject(ChangeMemberStatusHandler) private readonly changeMemberStatus: ChangeMemberStatusHandler,
    @Inject(CreateOrgRoleHandler) private readonly createOrgRole: CreateOrgRoleHandler,
    @Inject(DeleteMemberHandler) private readonly deleteMember: DeleteMemberHandler,
    @Inject(DeleteOrgRoleHandler) private readonly deleteOrgRole: DeleteOrgRoleHandler,
    @Inject(GetMyPermissionsHandler) private readonly getMyPermissions: GetMyPermissionsHandler,
    @Inject(GetOrgAccessSummaryHandler) private readonly getOrgAccessSummary: GetOrgAccessSummaryHandler,
    @Inject(GetOrgMemberHandler) private readonly getOrgMember: GetOrgMemberHandler,
    @Inject(GetOrgRoleHandler) private readonly getOrgRole: GetOrgRoleHandler,
    @Inject(GetOrgRoleDeletionImpactHandler)
    private readonly getOrgRoleDeletionImpact: GetOrgRoleDeletionImpactHandler,
    @Inject(InviteMemberHandler) private readonly inviteMember: InviteMemberHandler,
    @Inject(ListOrgMembersHandler) private readonly listOrgMembers: ListOrgMembersHandler,
    @Inject(ListOrgRolesHandler) private readonly listOrgRoles: ListOrgRolesHandler,
    @Inject(ProvisionMemberHandler) private readonly provisionMember: ProvisionMemberHandler,
    @Inject(ResendInvitationHandler) private readonly resendInvitationHandler: ResendInvitationHandler,
    @Inject(ResetMemberPasswordHandler) private readonly resetMemberPassword: ResetMemberPasswordHandler,
    @Inject(RevokeInvitationHandler) private readonly revokeInvitationHandler: RevokeInvitationHandler,
    @Inject(SetRolePermissionsHandler) private readonly setRolePermissionsHandler: SetRolePermissionsHandler,
    @Inject(UpdateMemberProfileHandler) private readonly updateMemberProfile: UpdateMemberProfileHandler,
    @Inject(UpdateOrgRoleHandler) private readonly updateOrgRole: UpdateOrgRoleHandler,
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
    return this.getOrgAccessSummary.execute({ organizationId: ctx.organizationId });
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
    const snapshot = await this.getMyPermissions.execute({ actor });
    return {
      permissions: [...snapshot.permissions] as PermissionKey[],
      roles: [...snapshot.roles],
    };
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
    const result = await this.listOrgMembers.execute({
      organizationId: ctx.organizationId,
      filters: toOrgMemberListFilters(query),
    });
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
      employeeId: body.employeeId,
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
    const result = await this.getOrgMember.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
    });
    return toOrgMemberDetail(result.member, result.effectivePermissions as readonly PermissionKey[]);
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
    return this.inviteMember.execute({
      organizationId: ctx.organizationId,
      actorAdminId: ctx.adminId,
      email: body.email,
      roleIds: body.roleIds,
    });
  }

  @Post('invitations/:id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('memberships.manage')
  async revokeInvitation(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.revokeInvitationHandler.execute({
      organizationId: ctx.organizationId,
      invitationId: id,
      actorAdminId: ctx.adminId,
    });
  }

  @Post('invitations/:id/resend')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('memberships.invite', 'memberships.manage')
  async resendInvitation(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string) {
    return this.resendInvitationHandler.execute({
      organizationId: ctx.organizationId,
      invitationId: id,
      actorAdminId: ctx.adminId,
    });
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
    const updated = await this.updateMemberProfile.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
      actorAdminId: ctx.adminId,
      displayName: body.displayName,
      phone: body.phone,
    });
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
    const updated = await this.changeMemberStatus.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
      actorAdminId: ctx.adminId,
      status: body.status,
    });
    return toOrgMemberListItem(updated);
  }

  @Delete('members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('users.deactivate', 'memberships.manage')
  @ApiOperation({ summary: 'Permanently delete a member account' })
  async removeMember(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteMember.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
      actorAdminId: ctx.adminId,
    });
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
    const updated = await this.assignMemberRoles.execute({
      organizationId: ctx.organizationId,
      membershipId: id,
      actorAdminId: ctx.adminId,
      roleIds: body.roleIds,
    });
    return toOrgMemberListItem(updated);
  }

  @Get('roles')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.read')
  async listRoles(@CrmContext() ctx: CrmRequestContext): Promise<OrgRoleListResponse> {
    const roles = await this.listOrgRoles.execute({ organizationId: ctx.organizationId });
    return { items: roles.map(toOrgRoleListItem) };
  }

  @Get('roles/:id')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.read')
  async getRole(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<OrgRoleDetail> {
    const role = await this.getOrgRole.execute({ organizationId: ctx.organizationId, roleId: id });
    return toOrgRoleDetail(role);
  }

  @Get('roles/:id/deletion-impact')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Role deletion dependency check' })
  async getRoleDeletionImpact(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id') id: string,
  ): Promise<OrgRoleDeletionImpactResponse> {
    return this.getOrgRoleDeletionImpact.execute({
      organizationId: ctx.organizationId,
      roleId: id,
    });
  }

  @Post('roles')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.create')
  async createRole(@CrmContext() ctx: CrmRequestContext, @Body() raw: unknown) {
    const body = createRoleRequestSchema.parse(raw);
    const role = await this.createOrgRole.execute({
      organizationId: ctx.organizationId,
      actorAdminId: ctx.adminId,
      key: body.key,
      name: body.name,
      description: body.description ?? '',
      permissionKeys: body.permissionKeys,
    });
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
    const role = await this.updateOrgRole.execute({
      organizationId: ctx.organizationId,
      roleId: id,
      actorAdminId: ctx.adminId,
      name: body.name,
      description: body.description,
      status: body.status,
    });
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
    const role = await this.setRolePermissionsHandler.execute({
      organizationId: ctx.organizationId,
      roleId: id,
      actorAdminId: ctx.adminId,
      permissionKeys: body.permissionKeys,
    });
    return toOrgRoleListItem(role);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
  @RequirePermissions('roles.delete')
  async deleteRole(@CrmContext() ctx: CrmRequestContext, @Param('id') id: string): Promise<void> {
    await this.deleteOrgRole.execute({
      organizationId: ctx.organizationId,
      roleId: id,
      actorAdminId: ctx.adminId,
    });
  }
}
