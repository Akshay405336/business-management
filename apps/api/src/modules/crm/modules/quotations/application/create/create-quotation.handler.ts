import { Inject, Injectable } from '@nestjs/common';
import { CLIENT_REPOSITORY, type ClientRepository } from '../../../clients/index.js';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../../service-packages/domain/repositories/service-package.repository.js';
import { QuotationCreatedEvent } from '../../domain/events/quotation-created.event.js';
import { QuotationCreationPolicy } from '../../domain/policies/quotation-creation.policy.js';
import { QuotationValidityPolicy } from '../../domain/policies/quotation-validity.policy.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import { QuotationPricingService } from '../../domain/services/quotation-pricing.service.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';
import {
  assertQuotationClientExists,
  resolveLineItemsForCreate,
} from '../shared/quotation-write-preparation.js';
import { quotationAudit } from '../shared/quotation-audit.js';
import type { CreateQuotationCommand } from './create-quotation.command.js';

@Injectable()
export class CreateQuotationHandler {
  constructor(
    @Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository,
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly servicePackages: ServicePackageRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(command: CreateQuotationCommand): Promise<QuotationReadModel> {
    const { actor, input } = command;
    const validated = QuotationCreationPolicy.validate({
      ...input,
      createdByAdminId: actor.adminId,
    });
    const dates = QuotationValidityPolicy.resolveCreateDates({
      issueDate: validated.issueDate,
      expiryDate: validated.expiryDate,
    });
    const withDates = { ...validated, ...dates };
    await assertQuotationClientExists(this.clients, actor.organizationId, withDates.clientId);
    const { lineItems, packageSnapshot } = await resolveLineItemsForCreate(
      actor.organizationId,
      withDates,
      this.servicePackages,
    );
    const quotationId = crypto.randomUUID();
    const { lineItems: persistedLines, totals } = QuotationPricingService.materializeLineItems(
      quotationId,
      lineItems,
    );
    void new QuotationCreatedEvent(actor.organizationId, quotationId);

    return this.quotations.create(
      actor.organizationId,
      {
        ...withDates,
        id: quotationId,
        lineItems: persistedLines,
        totals,
        packageSnapshot,
      },
      quotationAudit(actor, 'QUOTATION_CREATED', quotationId),
    );
  }
}
