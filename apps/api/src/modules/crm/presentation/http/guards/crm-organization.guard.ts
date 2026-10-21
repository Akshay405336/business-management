import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { API_ERROR_CODES } from '@techwin/contracts';
import { ApiException } from '../../../../../common/filters/api-error.response.js';
import { CRM_REPOSITORY, type CrmRepository } from '../../../domain/repositories/crm.repository.js';
import type { PlatformAuthenticatedRequest } from '../../../../auth/index.js';

export interface CrmRequestContext {
  readonly organizationId: string;
  readonly adminId: string;
}

export type CrmAuthenticatedRequest = PlatformAuthenticatedRequest & {
  crm?: CrmRequestContext;
};

/** Ensures the signed-in admin is linked to a tenant organization (lazy default org). */
@Injectable()
export class CrmOrganizationGuard implements CanActivate {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CrmAuthenticatedRequest>();
    const auth = request.platformAuth;
    if (!auth) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        API_ERROR_CODES.UNAUTHENTICATED,
        'Authentication is required.',
      );
    }

    const { organizationId } = await this.crm.ensureOrganizationForAdmin(auth.adminId);
    request.crm = { organizationId, adminId: auth.adminId };
    return true;
  }
}
