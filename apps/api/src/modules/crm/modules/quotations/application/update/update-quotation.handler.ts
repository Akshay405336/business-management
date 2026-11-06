import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../../service-packages/domain/repositories/service-package.repository.js';
import { Quotation } from '../../domain/entities/quotation.entity.js';
import { QuotationUpdatedEvent } from '../../domain/events/quotation-updated.event.js';
import { QuotationNotFoundError } from '../../domain/errors/quotation.errors.js';
import { QuotationUpdatePolicy } from '../../domain/policies/quotation-update.policy.js';
import { QuotationValidityPolicy } from '../../domain/policies/quotation-validity.policy.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import { QuotationPricingService } from '../../domain/services/quotation-pricing.service.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';
import { resolveLineItemsForUpdate } from '../shared/quotation-write-preparation.js';
import { quotationAudit } from '../shared/quotation-audit.js';
import type { UpdateQuotationCommand } from './update-quotation.command.js';

@Injectable()
export class UpdateQuotationHandler {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly servicePackages: ServicePackageRepository,
  ) {}

  async execute(command: UpdateQuotationCommand): Promise<QuotationReadModel> {
    const { actor, quotationId, input } = command;
    const existing = await this.quotations.findById(actor.organizationId, quotationId);
    if (!existing) throw new QuotationNotFoundError('Quotation');

    const quotation = Quotation.reconstitute(existing);
    quotation.assertCanUpdate();
    const validated = QuotationUpdatePolicy.validatePatch(input);
    QuotationValidityPolicy.validatePatch({
      issueDate: validated.issueDate,
      expiryDate: validated.expiryDate,
      existingIssueDate: existing.issueDate,
      existingExpiryDate: existing.expiryDate,
    });

    const resolvedLines = await resolveLineItemsForUpdate(
      actor.organizationId,
      validated.lineItems,
      this.servicePackages,
    );
    let persistedLines: ReturnType<
      typeof QuotationPricingService.materializeLineItems
    >['lineItems'] | undefined;
    let totals: ReturnType<typeof QuotationPricingService.materializeLineItems>['totals'] | undefined;
    if (resolvedLines) {
      const materialized = QuotationPricingService.materializeLineItems(quotationId, resolvedLines);
      persistedLines = materialized.lineItems;
      totals = materialized.totals;
    }

    void new QuotationUpdatedEvent(actor.organizationId, quotationId);

    return this.quotations.update(
      actor.organizationId,
      quotationId,
      { ...validated, lineItems: persistedLines, totals },
      quotationAudit(actor, 'QUOTATION_UPDATED', quotationId),
    );
  }
}
