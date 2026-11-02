import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '../../domain/types/org-access.types.js';
import { PermissionCheckerService } from '../services/permission-checker.service.js';
import type { GetMyPermissionsQuery } from './get-my-permissions.query.js';

@Injectable()
export class GetMyPermissionsHandler {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
  ) {}

  async execute(query: GetMyPermissionsQuery): Promise<readonly PermissionKey[]> {
    return this.permissionChecker.resolveEffectivePermissions(query.actor);
  }
}
