import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CrmAuthenticatedRequest, CrmRequestContext } from './crm-organization.guard.js';

export type { CrmRequestContext };

/** Resolves tenant context attached by `CrmOrganizationGuard`. */
export const CrmContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CrmRequestContext => {
    const crm = context.switchToHttp().getRequest<CrmAuthenticatedRequest>().crm;
    if (!crm) {
      throw new Error('CrmContext used on a route without CrmOrganizationGuard.');
    }
    return crm;
  },
);
