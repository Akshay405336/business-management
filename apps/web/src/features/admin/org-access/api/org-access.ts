import { ORG_ACCESS_ROUTES } from '@techwin/contracts';
import type {
  AcceptInvitationRequest,
  ProvisionMemberRequest,
  ResetMemberPasswordRequest,
} from '@techwin/validation';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type {
  AssignMemberRolesRequest,
  ChangeMemberStatusRequest,
  CreateInvitationResponse,
  CreateRoleRequest,
  InviteMemberRequest,
  MyPermissionsResponse,
  OrgAccessSummaryResponse,
  OrgMemberDetail,
  OrgMemberListItem,
  OrgMemberListQuery,
  OrgMemberListResponse,
  OrgRoleListItem,
  OrgRoleListResponse,
  PermissionCatalogResponse,
  SetRolePermissionsRequest,
  UpdateMemberRequest,
  UpdateRoleRequest,
} from '../types';

export function acceptOrgInvitation(
  body: AcceptInvitationRequest,
): Promise<{ organizationId: string; adminId: string }> {
  return apiRequest<{ organizationId: string; adminId: string }>(ORG_ACCESS_ROUTES.invitationAccept, {
    method: 'POST',
    body,
  });
}

export function resendOrgInvitation(id: string): Promise<CreateInvitationResponse> {
  return apiRequest<CreateInvitationResponse>(ORG_ACCESS_ROUTES.invitationResend(id), {
    method: 'POST',
    auth: true,
  });
}

export function getOrgAccessSummary(signal?: AbortSignal): Promise<OrgAccessSummaryResponse> {
  return apiRequest<OrgAccessSummaryResponse>(ORG_ACCESS_ROUTES.summary, { auth: true, signal });
}

export function getMyPermissions(signal?: AbortSignal): Promise<MyPermissionsResponse> {
  return apiRequest<MyPermissionsResponse>(ORG_ACCESS_ROUTES.myPermissions, { auth: true, signal });
}

export function getPermissionCatalog(signal?: AbortSignal): Promise<PermissionCatalogResponse> {
  return apiRequest<PermissionCatalogResponse>(ORG_ACCESS_ROUTES.permissions, { auth: true, signal });
}

export function listOrgMembers(
  query: Partial<OrgMemberListQuery> = {},
  signal?: AbortSignal,
): Promise<OrgMemberListResponse> {
  return apiRequest<OrgMemberListResponse>(
    `${ORG_ACCESS_ROUTES.members}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function getOrgMember(membershipId: string, signal?: AbortSignal): Promise<OrgMemberDetail> {
  return apiRequest<OrgMemberDetail>(ORG_ACCESS_ROUTES.member(membershipId), { auth: true, signal });
}

export function provisionOrgMember(body: ProvisionMemberRequest): Promise<OrgMemberListItem> {
  return apiRequest<OrgMemberListItem>(ORG_ACCESS_ROUTES.members, {
    method: 'POST',
    auth: true,
    body,
  });
}

export function inviteOrgMember(body: InviteMemberRequest): Promise<CreateInvitationResponse> {
  return apiRequest<CreateInvitationResponse>(ORG_ACCESS_ROUTES.invitations, {
    method: 'POST',
    auth: true,
    body,
  });
}

export function resetOrgMemberPassword(
  membershipId: string,
  body: ResetMemberPasswordRequest,
): Promise<void> {
  return apiRequest<void>(ORG_ACCESS_ROUTES.memberResetPassword(membershipId), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updateOrgMember(
  membershipId: string,
  body: UpdateMemberRequest,
): Promise<OrgMemberListItem> {
  return apiRequest<OrgMemberListItem>(ORG_ACCESS_ROUTES.member(membershipId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function changeOrgMemberStatus(
  membershipId: string,
  body: ChangeMemberStatusRequest,
): Promise<OrgMemberListItem> {
  return apiRequest<OrgMemberListItem>(ORG_ACCESS_ROUTES.memberStatus(membershipId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function assignOrgMemberRoles(
  membershipId: string,
  body: AssignMemberRolesRequest,
): Promise<OrgMemberListItem> {
  return apiRequest<OrgMemberListItem>(ORG_ACCESS_ROUTES.memberRoles(membershipId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function listOrgRoles(signal?: AbortSignal): Promise<OrgRoleListResponse> {
  return apiRequest<OrgRoleListResponse>(ORG_ACCESS_ROUTES.roles, { auth: true, signal });
}

export function createOrgRole(body: CreateRoleRequest): Promise<OrgRoleListItem> {
  return apiRequest<OrgRoleListItem>(ORG_ACCESS_ROUTES.roles, { method: 'POST', auth: true, body });
}

export function updateOrgRole(id: string, body: UpdateRoleRequest): Promise<OrgRoleListItem> {
  return apiRequest<OrgRoleListItem>(ORG_ACCESS_ROUTES.role(id), { method: 'PATCH', auth: true, body });
}

export function setOrgRolePermissions(
  id: string,
  body: SetRolePermissionsRequest,
): Promise<OrgRoleListItem> {
  return apiRequest<OrgRoleListItem>(ORG_ACCESS_ROUTES.rolePermissions(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteOrgRole(id: string): Promise<void> {
  return apiRequest<void>(ORG_ACCESS_ROUTES.role(id), { method: 'DELETE', auth: true });
}
