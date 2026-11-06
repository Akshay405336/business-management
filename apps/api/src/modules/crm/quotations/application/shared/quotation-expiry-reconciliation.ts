import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../../config/app-config.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';

@Injectable()
export class QuotationExpiryReconciliation {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async reconcileOrganization(organizationId: string): Promise<void> {
    await this.quotations.expireEligible(
      organizationId,
      this.config.quotations.expirationBatchSize,
    );
  }
}
