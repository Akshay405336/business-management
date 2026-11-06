import { Inject, Injectable } from '@nestjs/common';
import { Quotation } from '../../domain/entities/quotation.entity.js';
import { QuotationDeletedEvent } from '../../domain/events/quotation-deleted.event.js';
import { QuotationNotFoundError } from '../../domain/errors/quotation.errors.js';
import {
  QUOTATION_REPOSITORY,
  type QuotationRepository,
} from '../../domain/repositories/quotation.repository.js';
import { quotationAudit } from '../shared/quotation-audit.js';
import type { DeleteQuotationCommand } from './delete-quotation.command.js';

@Injectable()
export class DeleteQuotationHandler {
  constructor(@Inject(QUOTATION_REPOSITORY) private readonly quotations: QuotationRepository) {}

  async execute(command: DeleteQuotationCommand): Promise<void> {
    const { actor, quotationId } = command;
    const existing = await this.quotations.findById(actor.organizationId, quotationId);
    if (!existing) throw new QuotationNotFoundError('Quotation');

    Quotation.reconstitute(existing).assertCanDelete();
    void new QuotationDeletedEvent(actor.organizationId, quotationId);

    return this.quotations.delete(
      actor.organizationId,
      quotationId,
      quotationAudit(actor, 'QUOTATION_DELETED', quotationId),
    );
  }
}
