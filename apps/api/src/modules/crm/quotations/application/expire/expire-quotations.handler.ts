import { Inject, Injectable } from '@nestjs/common';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';

@Injectable()
export class ExpireQuotationsHandler {
  constructor(@Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository) {}

  async executeForOrganization(organizationId: string, limit: number): Promise<number> {
    return this.quotations.expireEligible(organizationId, limit);
  }

  async listOrganizationIds(): Promise<readonly string[]> {
    return this.quotations.listOrganizationIdsWithExpirableQuotations();
  }
}
